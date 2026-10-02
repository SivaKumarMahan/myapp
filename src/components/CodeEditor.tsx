import { useEffect, useRef } from 'react'
import { EditorState, type Extension } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder as placeholderText,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, bracketMatching, syntaxHighlighting } from '@codemirror/language'
import { autocompletion, closeBrackets, completionKeymap } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'

/**
 * Colours come from the app's own code tokens, so the editor follows the
 * light and dark themes without a second palette.
 */
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword], color: 'var(--code-keyword)', fontWeight: '600' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--code-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--code-number)' },
  { tag: [tags.lineComment, tags.blockComment], color: 'var(--code-comment)', fontStyle: 'italic' },
  { tag: [tags.typeName, tags.standard(tags.name)], color: 'var(--code-builtin)' },
  { tag: [tags.propertyName, tags.special(tags.name)], color: 'var(--code-key)' },
  { tag: [tags.punctuation, tags.operator], color: 'var(--code-punctuation)' },
])

const theme = EditorView.theme({
  '&': {
    color: 'var(--code-text)',
    backgroundColor: 'var(--bg-code)',
    fontSize: '0.9375rem',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { fontFamily: 'var(--font-mono)', padding: '0.6rem 0', caretColor: 'var(--text)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg-code)',
    color: 'var(--text-subtle)',
    border: 'none',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--primary) 7%, transparent)',
  },
  '.cm-cursor': { borderLeftColor: 'var(--text)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--primary) 28%, transparent) !important',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--primary-soft)',
    color: 'var(--primary-text)',
  },
  '.cm-placeholder': { color: 'var(--text-subtle)' },
})

/**
 * A CodeMirror 6 editor for the playgrounds. `language` supplies the syntax
 * and completion (SQL, KQL); Ctrl+Enter / Cmd+Enter calls `onRun`.
 */
export function CodeEditor({
  value,
  onChange,
  onRun,
  language,
  languageKey,
  label,
  placeholder = '',
  extensions,
  jumpTo,
  minLines = 6,
}: {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  language: Extension
  /** Changes when `language` must be rebuilt (new tables for completion). */
  languageKey: string
  label: string
  placeholder?: string
  /** More CodeMirror extensions (a linter, for one). Part of `languageKey`. */
  extensions?: Extension
  /** Moves the cursor to a line; change `nonce` to jump again to the same one. */
  jumpTo?: { line: number; nonce: number }
  minLines?: number
}) {
  const host = useRef<HTMLDivElement | null>(null)
  const view = useRef<EditorView | null>(null)
  // The editor is built once; these refs let it call the latest callbacks.
  const callbacks = useRef({ onChange, onRun })
  callbacks.current = { onChange, onRun }

  useEffect(() => {
    if (!host.current) return
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: view.current?.state.doc.toString() ?? value,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          language,
          extensions ?? [],
          syntaxHighlighting(highlight),
          theme,
          placeholderText(placeholder),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': label }),
          keymap.of([
            {
              key: 'Mod-Enter',
              preventDefault: true,
              run: () => {
                callbacks.current.onRun()
                return true
              },
            },
            ...completionKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = editor
    return () => {
      editor.destroy()
    }
    // Rebuilt only when the language changes (for completion); `value` is
    // pushed in by the effect below instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageKey, label])

  useEffect(() => {
    const editor = view.current
    if (!editor || !jumpTo) return
    const line = editor.state.doc.line(Math.min(Math.max(1, jumpTo.line), editor.state.doc.lines))
    editor.dispatch({ selection: { anchor: line.from, head: line.to }, scrollIntoView: true })
    editor.focus()
  }, [jumpTo])

  // Outside changes (loading an example or a history entry) replace the text.
  useEffect(() => {
    const editor = view.current
    if (!editor || editor.state.doc.toString() === value) return
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
  }, [value])

  return (
    <div
      className="sql-editor"
      ref={host}
      style={{ ['--sql-editor-min-height' as string]: `${minLines * 1.6 + 1.2}em` }}
    />
  )
}
