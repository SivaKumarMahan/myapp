import type { Course, PlannedCourse } from './types'
import { az900Course } from './az900'
import { az104Course } from './az104'
import { az400Course } from './az400'
import { ckadCourse } from './ckad'
import { terraformCourse } from './terraform'
import { dockerCourse } from './docker'

/**
 * Course registry.
 *
 * Adding another certification means building one more `Course` object under
 * `src/content/<course-id>/` and listing it here. Every page reads courses
 * from this registry, so no UI changes are needed.
 */
export const courses: Course[] = [
  az900Course,
  az104Course,
  az400Course,
  // DevOps courses from the original DevOps Learning Hub.
  ckadCourse,
  terraformCourse,
  dockerCourse,
]

/** Announced but not yet written, shown as "coming soon" on the home page. */
export const plannedCourses: PlannedCourse[] = [
  {
    id: 'az305',
    title: 'AZ-305 — Azure Solutions Architect Expert',
    subtitle: 'Identity, governance, data storage, business continuity and infrastructure design',
    icon: '🏛️',
    note: 'A natural next step after AZ-104. The content model already supports it.',
  },
  {
    id: 'cka',
    title: 'CKA — Certified Kubernetes Administrator',
    subtitle: 'Cluster operations, etcd, kubeadm, RBAC at cluster scope',
    icon: '🛠️',
    note: 'A natural next step after CKAD. The content model already supports it.',
  },
]

export function getCourse(courseId: string): Course | undefined {
  return courses.find((course) => course.id === courseId)
}

export { az900Course, az104Course, az400Course, ckadCourse, terraformCourse, dockerCourse }
