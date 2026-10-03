import { courseIndex, courseIdForTopic } from '../content/registry'
import { interviewTopicById } from '../content/interview'
import { sqlChallengeKey, sqlChallenges } from '../content/sql'
import { kqlChallengeKey, kqlChallenges } from '../content/kql'
import { pythonChallengeKey, pythonChallenges } from '../content/python'
import { missionKey, missions } from '../content/azcli'
import { labExerciseKey, labExercises } from '../content/configlab'
import { allNetKeys } from '../content/netlab'
import { allVizKeys } from '../content/visualise'
import { allArchKeys } from '../content/arch'
import {
  roles,
  skillById,
  type Importance,
  type Role,
  type Skill,
  type SkillLevel,
} from '../content/roles'
import { courseCompletion } from './stats'
import type { ProgressState } from './storage'

/**
 * The numbers behind Roles & skills.
 *
 * - **Coverage** (overview cards): how much of a role's *core* skills your
 *   progress covers. A skill counts as covered by the best of: ticked in My
 *   fit (100%), or your progress in the content it links to - interview
 *   recall, lessons completed, challenges solved. A skill with no content
 *   counts only when ticked.
 * - **Match** (My fit): only your ticks, over every skill the role needs,
 *   weighted by importance and depth.
 */

export const IMPORTANCE_WEIGHT: Record<Importance, number> = { core: 3, important: 2, nice: 1 }
export const LEVEL_WEIGHT: Record<SkillLevel, number> = { deep: 3, working: 2, basic: 1 }

const TOOL_KEYS: Record<string, () => string[]> = {
  sql: () => sqlChallenges.map((challenge) => sqlChallengeKey(challenge.id)),
  kql: () => kqlChallenges.map((challenge) => kqlChallengeKey(challenge.id)),
  python: () => pythonChallenges.map((challenge) => pythonChallengeKey(challenge.id)),
  cli: () => missions.map((mission) => missionKey(mission.id)),
  lab: () => labExercises.map((exercise) => labExerciseKey(exercise.id)),
  network: () => allNetKeys,
  'visualise-rbac': () => allVizKeys.filter((key) => key.startsWith('viz:rbac:')),
  'visualise-deploy': () => allVizKeys.filter((key) => key.startsWith('viz:deploy:')),
  'visualise-git': () => allVizKeys.filter((key) => key.startsWith('viz:git:')),
  'visualise-sla': () => allVizKeys.filter((key) => key.startsWith('viz:sla:')),
  architecture: () => allArchKeys,
}

/** 0-1: your progress in one piece of linked content. */
export function linkProgress(ref: string, state: ProgressState): number {
  const [kind, id] = ref.split(':')
  if (kind === 'itv') {
    const topic = interviewTopicById.get(id)
    if (!topic || topic.questions.length === 0) return 0
    const known = topic.questions.filter(
      (question) => state.interview[question.id]?.status === 'known',
    ).length
    return known / topic.questions.length
  }
  if (kind === 'lesson') {
    if (!courseIdForTopic(id)) return 0
    const status = state.topics[id]?.status
    return status === 'completed' ? 1 : status === 'in-progress' ? 0.5 : 0
  }
  if (kind === 'course') {
    const course = courseIndex(id)?.course
    return course ? courseCompletion(course, state).percent / 100 : 0
  }
  if (kind === 'tool') {
    const keys = TOOL_KEYS[id]?.() ?? []
    return keys.length === 0
      ? 0
      : keys.filter((key) => state.challenges[key]?.solvedAt).length / keys.length
  }
  return 0
}

export const isKnown = (skillId: string, state: ProgressState) => skillId in state.skills

/** 0-1: ticked, or the best progress among its linked content. */
export function skillCoverage(skill: Skill, state: ProgressState): number {
  if (isKnown(skill.id, state)) return 1
  return Math.max(0, ...skill.appLinks.map((ref) => linkProgress(ref, state)))
}

export interface RoleItem {
  skill: Skill
  level: SkillLevel
  importance: Importance
  area: string
}

/** A role's skills, flattened, each with its area's importance. */
export function roleItems(role: Role): RoleItem[] {
  return role.skillAreas.flatMap((area) =>
    area.items.flatMap((item) => {
      const skill = skillById.get(item.skill)
      return skill
        ? [{ skill, level: item.level, importance: area.importance, area: area.area }]
        : []
    }),
  )
}

const weighted = (
  items: RoleItem[],
  value: (item: RoleItem) => number,
  withImportance: boolean,
) => {
  let total = 0
  let got = 0
  for (const item of items) {
    const weight =
      LEVEL_WEIGHT[item.level] * (withImportance ? IMPORTANCE_WEIGHT[item.importance] : 1)
    total += weight
    got += weight * value(item)
  }
  return total === 0 ? 0 : Math.round((got / total) * 100)
}

/** 0-100: progress across the role's core skills. */
export function roleCoverage(role: Role, state: ProgressState): number {
  const core = roleItems(role).filter((item) => item.importance === 'core')
  return weighted(core, (item) => skillCoverage(item.skill, state), false)
}

/** 0-100: ticked skills over everything the role needs. */
export function roleMatch(role: Role, state: ProgressState): number {
  return weighted(roleItems(role), (item) => (isKnown(item.skill.id, state) ? 1 : 0), true)
}

/** The unticked skills worth learning first for a role. */
export function topGaps(role: Role, state: ProgressState, count = 5): RoleItem[] {
  return roleItems(role)
    .filter((item) => !isKnown(item.skill.id, state))
    .map((item, index) => ({
      item,
      index,
      score: IMPORTANCE_WEIGHT[item.importance] * LEVEL_WEIGHT[item.level],
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ item }) => item)
}

/** Every role that needs a skill, most important first. */
export function rolesNeeding(skillId: string): { role: Role; item: RoleItem }[] {
  return roles
    .flatMap((role) => {
      const item = roleItems(role).find((entry) => entry.skill.id === skillId)
      return item ? [{ role, item }] : []
    })
    .sort(
      (a, b) =>
        IMPORTANCE_WEIGHT[b.item.importance] * LEVEL_WEIGHT[b.item.level] -
        IMPORTANCE_WEIGHT[a.item.importance] * LEVEL_WEIGHT[a.item.level],
    )
}

/** Core skills of any role with no content in the app: the "what to add next" list. */
export function coreGaps(): { role: Role; skills: Skill[] }[] {
  return roles
    .map((role) => ({
      role,
      skills: roleItems(role)
        .filter((item) => item.importance === 'core' && item.skill.gap)
        .map((item) => item.skill),
    }))
    .filter((entry) => entry.skills.length > 0)
}
