import data from './compare.json'

export type IacLanguage = 'arm' | 'bicep' | 'terraform'

export interface IacConcept {
  id: string
  label: string
  note: string
  match: Record<IacLanguage, string[]>
}

export interface IacResource {
  id: string
  title: string
  summary: string
  arm: string
  bicep: string
  terraform: string
  concepts: IacConcept[]
}

export const iacResources = data.resources as IacResource[]

/** 0-based line numbers in `code` that belong to a concept. */
export function conceptLines(code: string, tokens: string[]): number[] {
  return code
    .split('\n')
    .flatMap((line, index) => (tokens.some((token) => line.includes(token)) ? [index] : []))
}
