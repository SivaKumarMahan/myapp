import type { HLJSApi, Language } from 'highlight.js'

/**
 * A highlight.js language definition for Azure Bicep.
 *
 * highlight.js does not ship one. Like the HCL definition next to it, only the
 * token classes the stylesheet already themes are emitted, so Bicep samples
 * are coloured consistently with the YAML, shell and HCL ones.
 */
export function bicep(hljs: HLJSApi): Language {
  const INTERPOLATION = {
    className: 'template-variable',
    begin: /\$\{/,
    end: /\}/,
  }

  return {
    name: 'Bicep',
    aliases: ['bicep'],
    case_insensitive: false,
    keywords: {
      keyword:
        'param var resource module output targetScope existing import metadata type func ' +
        'for in if using extension',
      literal: 'true false null',
      built_in:
        'resourceGroup subscription tenant managementGroup deployment environment ' +
        'uniqueString concat format toLower toUpper length contains empty union ' +
        'split join replace substring guid resourceId subscriptionResourceId ' +
        'tenantResourceId reference listKeys string int bool array object any ' +
        'first last skip take range min max base64 json loadTextContent loadJsonContent ' +
        'getSecret dependsOn',
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      /* Multi-line strings use triple single quotes and do not interpolate. */
      { className: 'string', begin: /'''/, end: /'''/ },
      {
        className: 'string',
        begin: /'/,
        end: /'/,
        illegal: /\n/,
        contains: [{ begin: /\\./ }, INTERPOLATION],
      },
      /* Decorators such as @secure() and @description('...'). */
      { className: 'meta', begin: /@[a-zA-Z]+/ },
      /* A property name on the left of a colon. */
      { className: 'attr', begin: /\b[a-zA-Z_][a-zA-Z0-9_]*(?=\s*:)/ },
      hljs.NUMBER_MODE,
      { className: 'operator', begin: /[=?:!]|==|!=|>=|<=|&&|\|\||\?\?/ },
    ],
  }
}
