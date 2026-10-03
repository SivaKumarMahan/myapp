/**
 * Intent detection with plain rules - no AI. Quick-reply chips send the same
 * commands, so typing and tapping behave identically. Anything unrecognised
 * is treated as a search.
 */

export type Intent =
  | { kind: 'help' }
  | { kind: 'menu' }
  | { kind: 'mock'; topic?: string; level?: string; due?: boolean }
  | { kind: 'evaluate'; query?: string; id?: string }
  | {
      kind: 'tutor'
      action:
        | 'simpler'
        | 'analogy'
        | 'short'
        | 'long'
        | 'hint'
        | 'related'
        | 'mistakes'
        | 'followups'
        | 'scenario'
    }
  | { kind: 'coach'; focus: 'today' | 'weak' | 'due' | 'mistakes' | 'plan' }
  | { kind: 'rapid' }
  | { kind: 'scenario'; id?: string }
  | { kind: 'rate'; rating: 1 | 2 | 3 | 4 }
  | { kind: 'self'; points: number[] }
  | { kind: 'skip' }
  | { kind: 'stop' }
  | { kind: 'choose'; index: number }
  | { kind: 'open'; id: string }
  | { kind: 'timeout' }
  | { kind: 'search'; query: string }
  | { kind: 'answer'; text: string }

const LEVELS = ['basic', 'intermediate', 'senior', 'advanced']

/** `awaitingAnswer`: the bot asked a question, so free text is an answer, not a search. */
export function detect(input: string, awaitingAnswer: boolean): Intent {
  const text = input.trim()
  const lower = text.toLowerCase()

  // Slash commands (what the chips send).
  const command = /^\/(\w+)(?:\s+(.*))?$/.exec(text)
  if (command) {
    const [, name, arg = ''] = command
    switch (name) {
      case 'help':
        return { kind: 'help' }
      case 'menu':
        return { kind: 'menu' }
      case 'mock': {
        const parts = arg.split(/\s+/).filter(Boolean)
        return {
          kind: 'mock',
          due: parts.includes('due'),
          level: parts.find((part) => LEVELS.includes(part)),
          topic: parts.find((part) => part !== 'due' && !LEVELS.includes(part)),
        }
      }
      case 'evaluate':
        return { kind: 'evaluate', query: arg || undefined }
      case 'practise':
      case 'practice':
        return { kind: 'evaluate', id: arg.trim() }
      case 'rapid':
        return { kind: 'rapid' }
      case 'scenario':
        return { kind: 'scenario', id: arg || undefined }
      case 'coach':
        return {
          kind: 'coach',
          focus: (['today', 'weak', 'due', 'mistakes', 'plan'].includes(arg)
            ? arg
            : 'today') as 'today',
        }
      case 'rate':
        return { kind: 'rate', rating: Math.min(4, Math.max(1, Number(arg) || 3)) as 1 | 2 | 3 | 4 }
      case 'self':
        return { kind: 'self', points: arg.split(',').filter(Boolean).map(Number) }
      case 'choose':
        return { kind: 'choose', index: Number(arg) || 0 }
      case 'open':
        return { kind: 'open', id: arg }
      case 'skip':
        return { kind: 'skip' }
      case 'stop':
        return { kind: 'stop' }
      case 'timeout':
        return { kind: 'timeout' }
      case 'simpler':
      case 'analogy':
      case 'short':
      case 'long':
      case 'hint':
      case 'related':
      case 'mistakes':
      case 'followups':
        return { kind: 'tutor', action: name }
      case 'variant':
        return { kind: 'tutor', action: 'scenario' }
      case 'search':
        return { kind: 'search', query: arg }
    }
  }

  // Short tutor phrases work while a question is on the table.
  const ask = lower.replace(
    /^((please|can you|could you|give me|show me|tell me|i need|i want) )+((a|an|the|me) )?/,
    '',
  )
  const tutor: [RegExp, Extract<Intent, { kind: 'tutor' }>['action']][] = [
    [
      /^(explain )?((it|this|that) )?(more )?(simpler|simply|eli5|like i'?m (new|five))\b/,
      'simpler',
    ],
    [/^analog(y|ies)\b/, 'analogy'],
    [/^(short( answer)?|tl;?dr|30 ?sec(ond)?s?)\b/, 'short'],
    [/^(long( answer)?|full answer|in detail|more detail)\b/, 'long'],
    [/^(hint|help me|clue|i'?m stuck)\b/, 'hint'],
    [/^(related|similar)( questions?)?\b/, 'related'],
    [/^(common )?mistakes?\b/, 'mistakes'],
    [/^follow[ -]?ups?\b/, 'followups'],
  ]
  for (const [pattern, action] of tutor) if (pattern.test(ask)) return { kind: 'tutor', action }

  if (/^(skip|pass|next( question)?)$/.test(lower)) return { kind: 'skip' }
  if (/^(stop|quit|exit|end( session)?|cancel)$/.test(lower)) return { kind: 'stop' }
  if (/^(help|\?|what can you do)/.test(lower)) return { kind: 'help' }
  if (awaitingAnswer) return { kind: 'answer', text }

  if (/\b(mock|interview me|practi[cs]e interview|quiz me on)\b/.test(lower)) {
    const topic = /\bon ([\w -]+)$/.exec(lower)?.[1]
    return {
      kind: 'mock',
      topic,
      due: /\bdue\b/.test(lower),
      level: LEVELS.find((level) => lower.includes(level)),
    }
  }
  if (/\b(rapid|speed|quick[- ]?fire|timed)\b/.test(lower)) return { kind: 'rapid' }
  if (/\b(troubleshoot|scenario|incident|debug)\b/.test(lower)) return { kind: 'scenario' }
  if (/\b(evaluate|score|grade|mark)\b/.test(lower))
    return {
      kind: 'evaluate',
      query:
        lower.replace(/.*\b(evaluate|score|grade|mark)( my answer)?( to| on| for)?\s*/, '') ||
        undefined,
    }
  if (/\bwhat should i (study|do|learn)|study today|today'?s plan|where do i start/.test(lower))
    return { kind: 'coach', focus: 'today' }
  if (/\bweak(est)?\b/.test(lower)) return { kind: 'coach', focus: 'weak' }
  if (/\b(due|reviews?)\b/.test(lower) && text.split(/\s+/).length <= 5)
    return { kind: 'coach', focus: 'due' }
  if (/\bmistakes?\b/.test(lower) && text.split(/\s+/).length <= 5)
    return { kind: 'coach', focus: 'mistakes' }
  if (/\b(exam (date|plan)|plan to (my )?exam|days left)\b/.test(lower))
    return { kind: 'coach', focus: 'plan' }
  return { kind: 'search', query: text }
}
