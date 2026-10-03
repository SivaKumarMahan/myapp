import data from './roles.json'
import { interviewTopicById } from '../interview'
import { courseIdForTopic, courseIndex } from '../registry'

/**
 * Roles & skills: in-demand DevOps and cloud roles, the skills each needs,
 * and where this app covers them. All of it is data in `roles.json`: roles
 * reference shared skills by id, so a skill ticked in My fit counts for every
 * role that needs it.
 */

export type Importance = 'core' | 'important' | 'nice'
export type SkillType = 'concept' | 'tool' | 'language' | 'platform'
export type SkillLevel = 'basic' | 'working' | 'deep'

export interface Skill {
  id: string
  name: string
  type: SkillType
  /** `itv:<topic>`, `lesson:<lesson>`, `course:<course>` or `tool:<page>` (incl. `visualise-<tab>`). */
  appLinks: string[]
  /** No content in the app covers it yet. */
  gap?: boolean
  /** What "Ask the bot" searches for. */
  search: string
}

export interface RoleSkillArea {
  area: string
  importance: Importance
  items: { skill: string; level: SkillLevel }[]
}

export interface Certification {
  name: string
  issuer: string
  status: 'recommended' | 'optional'
  appLink?: string
}

export interface Role {
  id: string
  icon: string
  title: string
  alsoKnownAs: string[]
  oneLineSummary: string
  focus: string[]
  dayInLife: string[]
  skillAreas: RoleSkillArea[]
  toolsAtAGlance: string[]
  certifications: Certification[]
  interviewFocus: string[]
  learningPath: { title: string; detail: string; appLinks: string[] }[]
  overlapsWith: string[]
}

interface RolesFile {
  version: string
  areas: { id: string; title: string }[]
  skills: Skill[]
  roles: Role[]
}

const file = data as unknown as RolesFile

export const rolesVersion = file.version
export const skillAreas = file.areas
export const skills = file.skills
export const roles = file.roles
export const roleById = new Map(roles.map((role) => [role.id, role]))
export const skillById = new Map(skills.map((skill) => [skill.id, skill]))
export const areaTitle = new Map(skillAreas.map((area) => [area.id, area.title]))

const TOOLS: Record<string, { label: string; to: string }> = {
  sql: { label: 'SQL playground', to: '/sql' },
  kql: { label: 'KQL simulator', to: '/kql' },
  python: { label: 'Python playground', to: '/python' },
  cli: { label: 'Azure CLI simulator', to: '/cli' },
  lab: { label: 'Config lab', to: '/lab' },
  network: { label: 'Networking lab', to: '/network' },
  playground: { label: 'Code playground', to: '/playground' },
  'visualise-rbac': { label: 'Visualise: RBAC & Policy', to: '/visualise?tab=rbac' },
  'visualise-deploy': { label: 'Visualise: deployment strategies', to: '/visualise?tab=deploy' },
  'visualise-git': { label: 'Visualise: Git branching', to: '/visualise?tab=git' },
  'visualise-sla': { label: 'Visualise: composite SLA', to: '/visualise?tab=sla' },
  architecture: { label: 'Architecture builder', to: '/architecture' },
}

export interface ResolvedLink {
  ref: string
  kind: 'interview' | 'lesson' | 'course' | 'tool'
  label: string
  to: string
}

/** Turns an `appLinks` reference into a label and a route, or null if it no longer exists. */
export function resolveLink(ref: string): ResolvedLink | null {
  const [kind, id] = ref.split(':')
  if (kind === 'itv') {
    const topic = interviewTopicById.get(id)
    return topic ? { ref, kind: 'interview', label: topic.title, to: `/interview/${id}` } : null
  }
  if (kind === 'lesson') {
    const course = courseIndex(courseIdForTopic(id))?.course
    const lesson = course?.topics.find((topic) => topic.id === id)
    return course && lesson
      ? {
          ref,
          kind: 'lesson',
          label: `${course.examCode}: ${lesson.title}`,
          to: `${course.route}/topics/${id}`,
        }
      : null
  }
  if (kind === 'course') {
    const course = courseIndex(id)?.course
    return course
      ? { ref, kind: 'course', label: `${course.examCode} course`, to: course.route }
      : null
  }
  if (kind === 'tool') {
    const tool = TOOLS[id]
    return tool ? { ref, kind: 'tool', label: tool.label, to: tool.to } : null
  }
  return null
}

export const resolveLinks = (refs: string[]) =>
  refs.map(resolveLink).filter((link): link is ResolvedLink => link !== null)
