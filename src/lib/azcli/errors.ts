/** An error the simulated CLI prints in red, with az's own wording where it has one. */
export class CliError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CliError'
  }
}

/** Levenshtein distance, for "The most similar choice to 'creat' is: create". */
export function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]
}

export function similar(word: string, choices: string[]): string[] {
  return choices
    .map((choice) => ({ choice, score: distance(word, choice) }))
    .filter(
      ({ choice, score }) =>
        score <= Math.max(2, Math.floor(choice.length / 3)) || choice.startsWith(word),
    )
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(({ choice }) => choice)
}
