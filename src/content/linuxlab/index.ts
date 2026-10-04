import { cloudChallenges } from './challenges/cloud'
import { diskChallenges } from './challenges/disk'
import { fundamentalsChallenges } from './challenges/fundamentals'
import { jsonChallenges } from './challenges/json'
import { logChallenges } from './challenges/logs'
import { networkChallenges } from './challenges/network'
import { processChallenges } from './challenges/processes'
import { textChallenges } from './challenges/text'
import type { LabCategory, LabChallenge } from './types'

export type { LabChallenge, LabCategory, LabCheck } from './types'

/** Every Linux & Bash lab challenge, in display order. */
export const linuxChallenges: LabChallenge[] = [
  ...diskChallenges,
  ...logChallenges,
  ...textChallenges,
  ...jsonChallenges,
  ...networkChallenges,
  ...processChallenges,
  ...cloudChallenges,
  ...fundamentalsChallenges,
]

export const linuxCategories: LabCategory[] = [
  ...new Set(linuxChallenges.map((challenge) => challenge.category)),
]

export const linuxChallengeById = new Map(
  linuxChallenges.map((challenge) => [challenge.id, challenge]),
)
export const linuxKey = (id: string) => `linux:${id}`
export const allLinuxKeys = linuxChallenges.map((challenge) => linuxKey(challenge.id))
