import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import json from 'highlight.js/lib/languages/json'
import powershell from 'highlight.js/lib/languages/powershell'
import python from 'highlight.js/lib/languages/python'
import yaml from 'highlight.js/lib/languages/yaml'
import { bicep } from './bicep-language'
import { hcl } from './hcl-language'
import type { CodeLanguage } from '../content/types'

/**
 * Only the languages the content actually uses are registered, which keeps
 * highlight.js at a fraction of its full bundle size and keeps the app fully
 * self-contained for offline use. HCL is a local definition because
 * highlight.js does not ship one; Bicep is local for the same reason.
 */
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('dockerfile', dockerfile)
hljs.registerLanguage('python', python)
hljs.registerLanguage('hcl', hcl)
hljs.registerLanguage('powershell', powershell)
hljs.registerLanguage('bicep', bicep)

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Returns highlighted HTML for a code sample.
 *
 * highlight.js escapes its own output, and plain text is escaped here, so the
 * result is always safe to inject.
 */
export function highlightCode(code: string, language: CodeLanguage): string {
  if (language === 'text' || !hljs.getLanguage(language)) {
    return escapeHtml(code)
  }
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value
  } catch {
    return escapeHtml(code)
  }
}
