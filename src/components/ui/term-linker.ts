import { createContext, type ReactNode } from 'react'

/**
 * Optional hook into RichText's plain-text runs. A page that wants glossary
 * terms linked (lessons) provides one; everywhere else text renders as is,
 * and the glossary is not even loaded.
 */
export type TermLinker = (text: string, linked: Set<string>, key: string) => ReactNode[]

export const TermLinkerContext = createContext<TermLinker | null>(null)
