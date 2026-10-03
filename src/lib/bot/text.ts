import { distance } from '../azcli/errors'
import synonymData from '../../content/bot/synonyms.json'

/**
 * Text matching for scoring typed answers offline: lower-case, strip
 * punctuation and markdown, light stemming, fuzzy word matching (small edit
 * distance for longer words), phrase matching with small gaps, and synonym
 * groups so "NSG" and "network security group" count as the same thing.
 */

/** Strips the app's inline markdown (**bold**, `code`) for plain-text use. */
export const plain = (text: string) =>
  text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')

export function normalize(text: string): string {
  return plain(text)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9/+#.'-]+/g, ' ')
    .replace(/(^|\s)[.'-]+|[.'-]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SUFFIXES: [RegExp, string][] = [
  [/ies$/, 'y'],
  [/ied$/, 'y'],
  [/(ss)es$/, '$1'],
  [/([^aeiou])es$/, '$1e'],
  [/ing$/, ''],
  [/ed$/, ''],
  [/ly$/, ''],
  [/([^s])s$/, '$1'],
]

/** Light stemming: just enough that "routes", "routed" and "routing" meet. */
export function stem(word: string): string {
  if (word.length <= 3 || /\d/.test(word)) return word
  // Four-letter words only lose a plural s or a final e, so "zone" meets "zones".
  if (word.length === 4) return word.replace(/([^s])s$/, '$1').replace(/e$/, '')
  for (const [pattern, replacement] of SUFFIXES) {
    if (pattern.test(word)) {
      const stemmed = word.replace(pattern, replacement)
      if (stemmed.length >= 3) return stemmed.replace(/e$/, '')
    }
  }
  return word.replace(/e$/, '')
}

export const tokens = (text: string) => normalize(text).split(' ').filter(Boolean).map(stem)

/** Same word, allowing a typo or two in longer words. */
export function fuzzyEqual(a: string, b: string): boolean {
  if (a === b) return true
  const shorter = Math.min(a.length, b.length)
  if (shorter < 5 || /\d/.test(a) || /\d/.test(b)) return false
  return distance(a, b) <= (shorter >= 9 ? 2 : 1)
}

/** Does the phrase appear in the text, in order, with at most `gap` words between its words? */
export function containsPhrase(text: string[], phrase: string[], gap = 2): boolean {
  if (phrase.length === 0) return false
  for (let start = 0; start < text.length; start += 1) {
    if (!fuzzyEqual(text[start], phrase[0])) continue
    let position = start
    let ok = true
    for (let index = 1; index < phrase.length && ok; index += 1) {
      ok = false
      for (
        let next = position + 1;
        next <= Math.min(text.length - 1, position + 1 + gap);
        next += 1
      ) {
        if (fuzzyEqual(text[next], phrase[index])) {
          position = next
          ok = true
          break
        }
      }
    }
    if (ok) return true
  }
  return false
}

/** Phrase (stemmed, space-joined) -> its synonym group. */
const SYNONYMS = new Map<string, string[][]>()
for (const group of (synonymData as { groups: string[][] }).groups) {
  const stemmed = group.map((entry) => tokens(entry))
  for (const entry of stemmed) SYNONYMS.set(entry.join(' '), stemmed)
}

/** A keyword and every synonym of it, as token lists. */
export function expand(keyword: string): string[][] {
  const phrase = tokens(keyword)
  const group = SYNONYMS.get(phrase.join(' '))
  return group
    ? [phrase, ...group.filter((entry) => entry.join(' ') !== phrase.join(' '))]
    : [phrase]
}

export const mentions = (text: string[], keyword: string) =>
  expand(keyword).some((phrase) => containsPhrase(text, phrase))
