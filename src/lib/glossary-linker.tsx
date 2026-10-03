import { GlossaryTerm } from '../components/GlossaryTerm'
import type { TermLinker } from '../components/ui/term-linker'
import { splitTerms } from './glossary'

/** Turns glossary matches in a run of text into hover/tap definitions. */
export const linkGlossaryTerms: TermLinker = (text, linked, key) =>
  splitTerms(text, linked).map((segment, index) =>
    typeof segment === 'string' ? (
      segment
    ) : (
      <GlossaryTerm key={`${key}-g${index}`} id={segment.id} text={segment.text} />
    ),
  )
