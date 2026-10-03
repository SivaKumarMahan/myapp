/**
 * Deployment strategies as a step-by-step state machine. Each step is what
 * an operator (or a pipeline) does next; traffic follows from the state:
 *
 * - blue-green: a full second environment, then one switch of traffic.
 * - canary: one new instance and a traffic weight you raise in stages.
 * - rolling: instances replaced one at a time (maxSurge 1, maxUnavailable 0);
 *   traffic follows the share of ready new instances.
 * - rings: the release is promoted ring by ring, each behind a health gate.
 */

export type StrategyId = 'blue-green' | 'canary' | 'rolling' | 'rings'
export type Version = 'v1' | 'v2'

export interface Instance {
  id: string
  version: Version
  status: 'ready' | 'starting' | 'draining'
}

export interface Ring {
  name: string
  /** Share of users in this ring and all before it. */
  cumulative: number
}

export const RINGS: Ring[] = [
  { name: 'Ring 0 · internal users', cumulative: 1 },
  { name: 'Ring 1 · early adopters', cumulative: 10 },
  { name: 'Ring 2 · one region', cumulative: 40 },
  { name: 'Ring 3 · everyone', cumulative: 100 },
]

export interface DeployState {
  strategy: StrategyId
  instances: Instance[]
  /** 0-100: share of requests the load balancer sends to v2. */
  weight: number
  step: number
  phase: 'idle' | 'rolling-out' | 'done' | 'rolled-back' | 'halted'
  /** v2 has a bug: its requests fail. */
  failing: boolean
  ring: number
  log: string[]
}

const v1 = (n: number): Instance[] =>
  Array.from({ length: n }, (_, i) => ({ id: `v1-${i + 1}`, version: 'v1', status: 'ready' }))

export function initial(strategy: StrategyId, failing = false): DeployState {
  return {
    strategy,
    instances: v1(4),
    weight: 0,
    step: 0,
    phase: 'idle',
    failing,
    ring: -1,
    log: ['v1 is live on 4 instances. Press Next step to release v2.'],
  }
}

const readyCount = (state: DeployState, version: Version) =>
  state.instances.filter((instance) => instance.version === version && instance.status === 'ready')
    .length

/** Rolling: traffic is proportional to the ready instances of each version. */
const proportional = (state: DeployState) => {
  const newReady = readyCount(state, 'v2')
  const total = newReady + readyCount(state, 'v1')
  return total === 0 ? 0 : Math.round((newReady / total) * 100)
}

export const stepLabels: Record<StrategyId, string[]> = {
  'blue-green': [
    'Deploy v2 to the idle green environment',
    'Smoke-test green with no user traffic',
    'Switch all traffic to green',
    'Keep blue for a quick rollback, then retire it',
  ],
  canary: [
    'Add one v2 canary instance (0% traffic)',
    'Send 5% of traffic to the canary',
    'Raise to 25%',
    'Raise to 50%',
    'Send 100% to v2',
    'Retire v1',
  ],
  rolling: [
    'Start v2 instance 1 (surge)',
    'v2-1 ready · drain v1-1',
    'Start v2 instance 2',
    'v2-2 ready · drain v1-2',
    'Start v2 instance 3',
    'v2-3 ready · drain v1-3',
    'Start v2 instance 4',
    'v2-4 ready · drain v1-4',
  ],
  rings: RINGS.map((ring) => `Promote to ${ring.name} (${ring.cumulative}% of users)`),
}

export const isFinished = (state: DeployState) =>
  state.phase === 'done' || state.phase === 'rolled-back' || state.phase === 'halted'

/** Advances one step. */
export function next(state: DeployState): DeployState {
  if (isFinished(state)) return state
  const s: DeployState = {
    ...state,
    instances: state.instances.map((i) => ({ ...i })),
    log: [...state.log],
  }
  const label = stepLabels[s.strategy][s.step]
  s.phase = 'rolling-out'
  const say = (text: string) => s.log.push(text)

  switch (s.strategy) {
    case 'blue-green': {
      if (s.step === 0) {
        s.instances.push(
          ...Array.from({ length: 4 }, (_, i): Instance => ({
            id: `v2-${i + 1}`,
            version: 'v2',
            status: 'ready',
          })),
        )
        say('Green (v2) is up beside blue: 8 instances, double the cost for now.')
      } else if (s.step === 1) {
        say(
          s.failing
            ? 'Smoke tests against green FAIL - you can roll back now and no user ever saw v2.'
            : 'Smoke tests against green pass. Users are still all on blue.',
        )
      } else if (s.step === 2) {
        s.weight = 100
        say(
          'Traffic switched: every new request goes to green (e.g. a slot swap or a load balancer change).',
        )
      } else if (s.step === 3) {
        s.instances = s.instances.filter((i) => i.version === 'v2')
        s.phase = 'done'
        say('Blue retired. Rolling back from here means redeploying v1.')
      }
      break
    }
    case 'canary': {
      const weights = [0, 5, 25, 50, 100]
      if (s.step === 0) s.instances.push({ id: 'v2-1', version: 'v2', status: 'ready' })
      if (s.step >= 1 && s.step <= 4) {
        s.weight = weights[s.step]
        if (s.step === 4)
          s.instances.push(
            ...[2, 3, 4].map((n): Instance => ({ id: `v2-${n}`, version: 'v2', status: 'ready' })),
          )
      }
      if (s.step === 5) {
        s.instances = s.instances.filter((i) => i.version === 'v2')
        s.phase = 'done'
      }
      say(
        `${label}.${s.failing && s.weight > 0 && s.weight < 100 ? ` Errors on the canary affect ${s.weight}% of requests - roll back before raising the weight.` : ''}`,
      )
      break
    }
    case 'rolling': {
      const n = Math.floor(s.step / 2) + 1
      if (s.step % 2 === 0) {
        s.instances.push({ id: `v2-${n}`, version: 'v2', status: 'starting' })
        say(`${label}: 5 instances for a moment (maxSurge 1), none removed until it is ready.`)
      } else {
        const starting = s.instances.find((i) => i.id === `v2-${n}`)
        if (starting) starting.status = 'ready'
        s.instances = s.instances.filter((i) => i.id !== `v1-${n}`)
        say(
          `${label}. Traffic now follows the ready instances.${s.failing ? ' Readiness probes pass but requests fail - only metrics or a health gate would stop this.' : ''}`,
        )
      }
      s.weight = proportional(s)
      if (s.step === 7) s.phase = 'done'
      break
    }
    case 'rings': {
      s.ring = s.step
      const ring = RINGS[s.ring]
      if (s.failing && s.ring >= 1) {
        s.phase = 'halted'
        s.weight = RINGS[s.ring - 1].cumulative
        say(
          `Health gate before ${ring.name} FAILS (error rate up in the previous ring). Promotion halted at ${s.weight}% of users.`,
        )
        return { ...s, step: s.step + 1 }
      }
      s.weight = ring.cumulative
      if (s.ring === 0) s.instances.push({ id: 'v2-1', version: 'v2', status: 'ready' })
      if (s.ring === RINGS.length - 1) {
        s.instances = [1, 2, 3, 4].map((n): Instance => ({
          id: `v2-${n}`,
          version: 'v2',
          status: 'ready',
        }))
        s.phase = 'done'
      }
      say(
        `${ring.name}: ${ring.cumulative}% of users on v2, then a bake time and a health gate before the next ring.`,
      )
      break
    }
  }
  return { ...s, step: s.step + 1 }
}

/** The traffic slider: only meaningful once there are v2 instances to send traffic to. */
export function setWeight(state: DeployState, weight: number): DeployState {
  if (!canSlide(state)) return state
  return { ...state, weight: Math.max(0, Math.min(100, Math.round(weight))) }
}

export const canSlide = (state: DeployState) =>
  (state.strategy === 'canary' || state.strategy === 'blue-green') &&
  !isFinished(state) &&
  readyCount(state, 'v2') > 0 &&
  readyCount(state, 'v1') > 0

/** Sends everyone back to v1 - how fast depends on the strategy. */
export function rollback(state: DeployState): DeployState {
  if (state.weight === 0 && !state.instances.some((i) => i.version === 'v2')) return state
  const log = [...state.log]
  const hadV1 = readyCount(state, 'v1')
  const how: Record<StrategyId, string> = {
    'blue-green':
      hadV1 > 0
        ? 'Rollback: switch traffic back to blue - instant, because blue is still running.'
        : 'Rollback: blue was already retired, so v1 has to be redeployed first - minutes, not seconds.',
    canary:
      'Rollback: canary weight to 0% and remove the v2 instance. Only the canary share of users ever saw v2.',
    rolling:
      'Rollback: a rolling update back to v1 (e.g. kubectl rollout undo) - replaces instances one at a time again, so v2 keeps serving until it finishes.',
    rings:
      'Rollback: stop promotion and point the rings that got v2 back at v1. Later rings never saw it.',
  }
  log.push(how[state.strategy])
  return { ...state, instances: v1(4), weight: 0, phase: 'rolled-back', log }
}

/** Errors per 100 requests while v2 is broken (half of its requests fail). */
export const errorRate = (state: DeployState) =>
  state.failing ? Math.round(state.weight * 0.5) : 0

/** Chooses the instance for one request: the version by weight, then any ready instance of it. */
export function route(
  state: DeployState,
  pickVersion: number,
  pickInstance: number,
): Instance | undefined {
  const pool = (version: Version) =>
    state.instances.filter(
      (instance) => instance.version === version && instance.status === 'ready',
    )
  const v2s = pool('v2')
  const v1s = pool('v1')
  const useV2 = v2s.length > 0 && (v1s.length === 0 || pickVersion * 100 < state.weight)
  const list = useV2 ? v2s : v1s
  return list.length === 0
    ? undefined
    : list[Math.min(list.length - 1, Math.floor(pickInstance * list.length))]
}
