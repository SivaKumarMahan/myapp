import type { K8sCheck, K8sScenario } from '../../content/k8slab/types'
import {
  appFor,
  claimState,
  deploymentPods,
  deploymentReplicaSets,
  deploymentStatus,
  findObject,
  parseImage,
  podView,
  probeFailure,
  serviceEndpoints,
  templateHash,
  tick,
} from './cluster'
import { curl } from './net'
import type { Cluster, PodRecord } from './types'
import { clone, cpuMillis, memoryMi } from './util'

/**
 * "Check my fix" looks at the cluster, never at the commands typed: any
 * correct fix passes. The cluster is copied and run forward a few minutes
 * first, so a fix that only hides the symptom for a moment (deleting Pods,
 * delaying a bad probe) is caught when the restarts come back.
 */

export const CHECK_WINDOW = 180

export interface CheckResult {
  label: string
  passed: boolean
  messages: string[]
}

export interface CheckReport {
  passed: boolean
  results: CheckResult[]
}

const short = (text: string, max = 160) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

function podProblem(cluster: Cluster, pod: PodRecord): string | null {
  const view = podView(cluster, pod)
  if (!view.scheduled)
    return `Pod ${pod.name} is Pending: ${short(pod.unschedulable ?? 'not scheduled yet')}`
  if (view.ready) return null
  for (const container of view.containers) {
    if (container.state === 'waiting') {
      const detail =
        container.reason === 'CrashLoopBackOff' && container.last
          ? `last exit ${container.last.reason} (code ${container.last.exitCode})`
          : (container.message ?? '')
      return `Pod ${pod.name}: ${container.reason ?? view.status}${detail ? ` - ${short(detail)}` : ''}`
    }
    if (!container.ready) {
      const failure = view.events.filter((event) => event.reason === 'Unhealthy').pop()
      return `Pod ${pod.name} is running but not Ready${failure ? ` - ${short(failure.message)}` : ''}`
    }
  }
  return `Pod ${pod.name} is ${view.status}`
}

function deploymentOf(cluster: Cluster, name: string, namespace: string) {
  return findObject(cluster, 'Deployment', name, namespace)
}

const gone = (kind: string, name: string) =>
  `The ${kind} ${name} no longer exists - fix it rather than deleting it.`

function container(cluster: Cluster, deployment: string, name: string, namespace: string) {
  return deploymentOf(cluster, deployment, namespace)?.spec.template.spec.containers.find(
    (entry) => entry.name === name,
  )
}

function judge(check: K8sCheck, before: Cluster, after: Cluster, namespace: string): CheckResult {
  const ns = ('namespace' in check && check.namespace) || namespace
  switch (check.kind) {
    case 'rollout': {
      const label = `Deployment ${check.deployment} is fully rolled out, every Pod Ready, no restarts over the next ${CHECK_WINDOW / 60} minutes`
      const deployment = deploymentOf(after, check.deployment, ns)
      if (!deployment)
        return { label, passed: false, messages: [gone('Deployment', check.deployment)] }
      const status = deploymentStatus(after, deployment)
      const desired = deployment.spec.replicas ?? 1
      const messages: string[] = []
      if (desired === 0) messages.push('The Deployment is scaled to 0 - nothing is running.')
      const pods = deploymentPods(after, deployment)
      const problems = [
        ...new Set(
          pods
            .map((pod) => podProblem(after, pod))
            .filter((entry): entry is string => entry !== null),
        ),
      ]
      if (status.ready < desired)
        messages.push(`Only ${status.ready} of ${desired} replicas are Ready.`)
      messages.push(...problems.slice(0, 2))
      const current = deploymentReplicaSets(after, deployment).find(
        (rs) => rs.hash === templateHash(deployment.spec.template),
      )
      const leftover = pods.filter((pod) => pod.owner !== current?.name).length
      if (leftover && desired > 0)
        messages.push(
          `${leftover} Pod${leftover === 1 ? '' : 's'} of an older ReplicaSet are still running - the rollout has not finished.`,
        )
      const restarted = pods
        .map((pod) => ({ pod, view: podView(after, pod) }))
        .filter(({ view }) => view.lastRestartAt !== undefined && view.lastRestartAt > before.now)
      if (restarted.length)
        messages.push(
          `${restarted[0].pod.name} restarted ${restarted[0].view.restarts} time${restarted[0].view.restarts === 1 ? '' : 's'} while being watched - something still kills or crashes the container.`,
        )
      return { label, passed: messages.length === 0, messages: [...new Set(messages)] }
    }
    case 'endpoints': {
      const label = `Service ${check.service} sends traffic to the Pods of Deployment ${check.deployment}`
      const service = findObject(after, 'Service', check.service, ns)
      if (!service) return { label, passed: false, messages: [gone('Service', check.service)] }
      const deployment = deploymentOf(after, check.deployment, ns)
      if (!deployment)
        return { label, passed: false, messages: [gone('Deployment', check.deployment)] }
      const owned = new Set(deploymentPods(after, deployment).map((pod) => pod.name))
      const ready = serviceEndpoints(after, service).filter((entry) => entry.ready)
      const messages: string[] = []
      if (ready.length === 0)
        messages.push(
          `The Service has no ready endpoints (its selector ${
            Object.entries(service.spec.selector ?? {})
              .map(([key, value]) => `${key}=${value}`)
              .join(',') || '<none>'
          } matches no Ready Pod).`,
        )
      const strangers = ready.filter((entry) => !owned.has(entry.pod.name))
      if (strangers.length)
        messages.push(
          `${strangers.length} endpoint${strangers.length === 1 ? ' is a Pod' : 's are Pods'} not managed by Deployment ${check.deployment} (relabelled or orphaned) - a rollout would never update ${strangers.length === 1 ? 'it' : 'them'}.`,
        )
      const managed = ready.filter((entry) => owned.has(entry.pod.name)).length
      if (ready.length && managed < (deployment.spec.replicas ?? 1))
        messages.push(
          `Only ${managed} of ${deployment.spec.replicas ?? 1} replicas are behind the Service.`,
        )
      return { label, passed: messages.length === 0, messages }
    }
    case 'http': {
      const label = `curl ${check.url}${check.from === 'cluster' ? ' (from inside the cluster)' : ''} returns ${check.status}`
      const origin =
        check.from === 'cluster'
          ? {
              kind: 'pod' as const,
              pod: {
                name: 'lab-check',
                namespace: ns,
                uid: '',
                labels: {},
                owner: null,
                spec: { containers: [] },
                createdAt: 0,
                nodeName: null,
                ip: '10.244.0.250',
                saPullSecrets: [],
              },
            }
          : { kind: 'outside' as const }
      const result = curl(after, ['-s', '-S', '-i', check.url], origin)
      if (result.exitCode !== 0)
        return {
          label,
          passed: false,
          messages: [result.stderr.split('\n').pop() ?? 'The request failed.'],
        }
      const status = Number(/^HTTP\/1\.1 (\d+)/.exec(result.stdout)?.[1] ?? 0)
      const reason = /^HTTP\/1\.1 \d+ (.*)$/m.exec(result.stdout)?.[1] ?? ''
      if (status !== check.status)
        return { label, passed: false, messages: [`Got ${status} ${reason}.`] }
      if (check.contains && !result.stdout.includes(check.contains))
        return {
          label,
          passed: false,
          messages: [`The response does not mention “${check.contains}”.`],
        }
      return { label, passed: true, messages: [] }
    }
    case 'pvc': {
      const label = `The volume claim used by ${check.deployment} is Bound`
      const deployment = deploymentOf(after, check.deployment, ns)
      if (!deployment)
        return { label, passed: false, messages: [gone('Deployment', check.deployment)] }
      const claims = (deployment.spec.template.spec.volumes ?? [])
        .map((volume) => volume.persistentVolumeClaim?.claimName)
        .filter((name): name is string => Boolean(name))
      const messages: string[] = []
      for (const name of claims) {
        const claim = findObject(after, 'PersistentVolumeClaim', name, ns)
        if (!claim) messages.push(`PersistentVolumeClaim ${name} does not exist.`)
        else {
          const state = claimState(after, claim)
          if (state.phase !== 'Bound')
            messages.push(
              `PersistentVolumeClaim ${name} is ${state.phase}${state.problem ? `: ${state.problem}` : ''}.`,
            )
        }
      }
      if (claims.length === 0) messages.push('The Deployment mounts no PersistentVolumeClaim.')
      return { label, passed: messages.length === 0, messages }
    }
    case 'exists': {
      const label = `${check.resource} ${check.name} still exists`
      return findObject(after, check.resource, check.name, ns)
        ? { label, passed: true, messages: [] }
        : { label, passed: false, messages: [gone(check.resource, check.name)] }
    }
    case 'image': {
      const label = `Container ${check.container} uses ${check.repo}${check.tag ? `:${check.tag}` : ''}`
      const entry = container(after, check.deployment, check.container, ns)
      if (!entry)
        return {
          label,
          passed: false,
          messages: [`Container ${check.container} of Deployment ${check.deployment} is gone.`],
        }
      const ref = parseImage(entry.image)
      if (!ref || ref.repo !== check.repo)
        return {
          label,
          passed: false,
          messages: [`The image is now ${entry.image} - keep the repository ${check.repo}.`],
        }
      if (check.tag && ref.tag !== check.tag)
        return {
          label,
          passed: false,
          messages: [`The tag is ${ref.tag}; it should be ${check.tag}.`],
        }
      return { label, passed: true, messages: [] }
    }
    case 'replicas': {
      const label = `Deployment ${check.deployment} keeps ${check.count} replicas`
      const deployment = deploymentOf(after, check.deployment, ns)
      if (!deployment)
        return { label, passed: false, messages: [gone('Deployment', check.deployment)] }
      const count = deployment.spec.replicas ?? 1
      return count === check.count
        ? { label, passed: true, messages: [] }
        : { label, passed: false, messages: [`It has ${count}; keep ${check.count}.`] }
    }
    case 'memory-limit':
    case 'cpu-request': {
      const memory = check.kind === 'memory-limit'
      const label = memory
        ? `Memory limit of ${check.container} is between ${check.min} and ${check.max}`
        : `CPU request of ${check.container} is between ${check.min} and ${check.max}`
      const entry = container(after, check.deployment, check.container, ns)
      if (!entry)
        return {
          label,
          passed: false,
          messages: [`Container ${check.container} of Deployment ${check.deployment} is gone.`],
        }
      const raw = memory ? entry.resources?.limits?.memory : entry.resources?.requests?.cpu
      if (!raw)
        return {
          label,
          passed: false,
          messages: [
            memory
              ? "There is no memory limit any more - one bad request could take the node's memory."
              : 'There is no CPU request - the scheduler would treat it as free.',
          ],
        }
      const toNumber = memory ? memoryMi : cpuMillis
      const value = toNumber(raw)
      if (value < toNumber(check.min))
        return {
          label,
          passed: false,
          messages: [`${raw} is too low${memory ? ' - the app needs more than that' : ''}.`],
        }
      if (value > toNumber(check.max))
        return {
          label,
          passed: false,
          messages: [`${raw} is more than this workload needs (max ${check.max}).`],
        }
      return { label, passed: true, messages: [] }
    }
    case 'probe': {
      const word = check.probe === 'livenessProbe' ? 'liveness' : 'readiness'
      const label = `The ${word} probe is still there and checks the app correctly`
      const entry = container(after, check.deployment, check.container, ns)
      const probe = entry?.[check.probe]
      if (!entry || !probe)
        return {
          label,
          passed: false,
          messages: [`The ${word} probe was removed - it must stay, pointing at the right place.`],
        }
      const app = appFor(after, entry.image)
      const failure = app
        ? probeFailure(
            entry,
            app,
            probe,
            '<pod-ip>',
            word === 'liveness' ? 'Liveness' : 'Readiness',
          )
        : null
      if (failure) return { label, passed: false, messages: [failure] }
      if (word === 'liveness' && (probe.initialDelaySeconds ?? 0) > 120)
        return {
          label,
          passed: false,
          messages: [
            'An initialDelaySeconds this long only postpones the problem - use a startupProbe for slow starters.',
          ],
        }
      return { label, passed: true, messages: [] }
    }
    case 'node-selector': {
      const label = `Pods still select nodes with ${Object.entries(check.labels)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')}`
      const deployment = deploymentOf(after, check.deployment, ns)
      if (!deployment)
        return { label, passed: false, messages: [gone('Deployment', check.deployment)] }
      const selector = deployment.spec.template.spec.nodeSelector ?? {}
      const missing = Object.entries(check.labels).filter(([key, value]) => selector[key] !== value)
      return missing.length
        ? {
            label,
            passed: false,
            messages: [
              'The nodeSelector was removed or changed - the workload must stay on its node pool.',
            ],
          }
        : { label, passed: true, messages: [] }
    }
    case 'taint': {
      const label = `Node ${check.node} keeps its ${check.key} taint`
      const node = after.nodes.find((entry) => entry.name === check.node)
      return node?.taints.some((taint) => taint.key === check.key)
        ? { label, passed: true, messages: [] }
        : {
            label,
            passed: false,
            messages: [
              'The taint was removed - now any workload can land on the expensive nodes. Tolerate it instead.',
            ],
          }
    }
    case 'volume': {
      const label = `Deployment ${check.deployment} still keeps its data on a PersistentVolumeClaim`
      const deployment = deploymentOf(after, check.deployment, ns)
      if (!deployment)
        return { label, passed: false, messages: [gone('Deployment', check.deployment)] }
      const ok = (deployment.spec.template.spec.volumes ?? []).some(
        (volume) => volume.persistentVolumeClaim,
      )
      return ok
        ? { label, passed: true, messages: [] }
        : {
            label,
            passed: false,
            messages: [
              'The volume is no longer a PersistentVolumeClaim - the data would be lost on every restart.',
            ],
          }
    }
  }
}

/** Checks the live cluster against a scenario's checks (on a copy run a few minutes forward). */
export function checkScenario(
  scenario: Pick<K8sScenario, 'checks' | 'setup'>,
  cluster: Cluster,
): CheckReport {
  const before = clone(cluster)
  const after = clone(cluster)
  tick(after, CHECK_WINDOW)
  const results = scenario.checks.map((check) =>
    judge(check, before, after, scenario.setup.namespace),
  )
  return { passed: results.every((result) => result.passed), results }
}
