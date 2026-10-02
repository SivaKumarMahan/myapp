import { containsIp, isCidr, parseCidr, parseIp } from './cidr'

/**
 * Network security group evaluation, the way Azure does it: rules in
 * priority order (lowest number first), first match wins, defaults last.
 * For inbound traffic the subnet's NSG is checked first, then the NIC's; for
 * outbound traffic the NIC's first, then the subnet's. Both must allow.
 */

export type Direction = 'Inbound' | 'Outbound'
export type Protocol = 'Any' | 'TCP' | 'UDP' | 'ICMP'
export type Access = 'Allow' | 'Deny'

export interface NsgRule {
  name: string
  priority: number
  direction: Direction
  access: Access
  protocol: Protocol
  /** A CIDR, an IP, `*` / Any, or a service tag. */
  source: string
  sourcePorts: string
  destination: string
  destinationPorts: string
}

export interface Nsg {
  name: string
  attached: boolean
  rules: NsgRule[]
}

export interface Packet {
  direction: Direction
  protocol: Exclude<Protocol, 'Any'>
  sourceIp: string
  sourcePort: number
  destinationIp: string
  destinationPort: number
}

/** What the service tags mean in this lab. */
export interface TagContext {
  /** The VNet's address space(s); VirtualNetwork means these (and peered ones). */
  vnet: string[]
}

export const SERVICE_TAGS = ['Any', 'VirtualNetwork', 'Internet', 'AzureLoadBalancer'] as const

export const DEFAULT_RULES: NsgRule[] = [
  {
    name: 'AllowVnetInBound',
    priority: 65000,
    direction: 'Inbound',
    access: 'Allow',
    protocol: 'Any',
    source: 'VirtualNetwork',
    sourcePorts: '*',
    destination: 'VirtualNetwork',
    destinationPorts: '*',
  },
  {
    name: 'AllowAzureLoadBalancerInBound',
    priority: 65001,
    direction: 'Inbound',
    access: 'Allow',
    protocol: 'Any',
    source: 'AzureLoadBalancer',
    sourcePorts: '*',
    destination: 'Any',
    destinationPorts: '*',
  },
  {
    name: 'DenyAllInBound',
    priority: 65500,
    direction: 'Inbound',
    access: 'Deny',
    protocol: 'Any',
    source: 'Any',
    sourcePorts: '*',
    destination: 'Any',
    destinationPorts: '*',
  },
  {
    name: 'AllowVnetOutBound',
    priority: 65000,
    direction: 'Outbound',
    access: 'Allow',
    protocol: 'Any',
    source: 'VirtualNetwork',
    sourcePorts: '*',
    destination: 'VirtualNetwork',
    destinationPorts: '*',
  },
  {
    name: 'AllowInternetOutBound',
    priority: 65001,
    direction: 'Outbound',
    access: 'Allow',
    protocol: 'Any',
    source: 'Any',
    sourcePorts: '*',
    destination: 'Internet',
    destinationPorts: '*',
  },
  {
    name: 'DenyAllOutBound',
    priority: 65500,
    direction: 'Outbound',
    access: 'Deny',
    protocol: 'Any',
    source: 'Any',
    sourcePorts: '*',
    destination: 'Any',
    destinationPorts: '*',
  },
]

/** The Azure platform address load balancer probes come from. */
export const AZURE_LB_IP = '168.63.129.16'

const PRIVATE = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '100.64.0.0/10',
  '169.254.0.0/16',
  '127.0.0.0/8',
]

function addressMatches(
  spec: string,
  ip: string,
  context: TagContext,
): { ok: boolean; why: string } {
  const value = spec.trim()
  const address = parseIp(ip)
  if (address === null) return { ok: false, why: `${ip} is not an IP address` }
  if (value === '*' || value.toLowerCase() === 'any') return { ok: true, why: 'any address' }
  const inRanges = (ranges: string[]) =>
    ranges.some((range) => {
      const parsed = parseCidr(range.includes('/') ? range : `${range}/32`)
      return isCidr(parsed) && containsIp(parsed, address)
    })
  if (value === 'VirtualNetwork') {
    const ok = inRanges(context.vnet)
    return {
      ok,
      why: ok
        ? `${ip} is in the VNet (${context.vnet.join(', ')})`
        : `${ip} is outside the VNet (${context.vnet.join(', ')})`,
    }
  }
  if (value === 'Internet') {
    const ok = !inRanges([...PRIVATE, ...context.vnet]) && ip !== AZURE_LB_IP
    return {
      ok,
      why: ok ? `${ip} is a public (Internet) address` : `${ip} is not an Internet address`,
    }
  }
  if (value === 'AzureLoadBalancer') {
    const ok = ip === AZURE_LB_IP
    return {
      ok,
      why: ok ? `${ip} is the Azure load balancer probe address` : `${ip} is not ${AZURE_LB_IP}`,
    }
  }
  const ranges = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const ok = inRanges(ranges)
  return { ok, why: ok ? `${ip} is in ${value}` : `${ip} is not in ${value}` }
}

function portMatches(spec: string, port: number): { ok: boolean; why: string } {
  const value = spec.trim()
  if (value === '*' || value.toLowerCase() === 'any') return { ok: true, why: 'any port' }
  const ok = value.split(',').some((part) => {
    const [low, high] = part.trim().split('-').map(Number)
    return high === undefined ? port === low : port >= low && port <= high
  })
  return { ok, why: ok ? `port ${port} is in ${value}` : `port ${port} is not in ${value}` }
}

export interface RuleCheck {
  rule: NsgRule
  isDefault: boolean
  matched: boolean
  criteria: { label: string; ok: boolean; why: string }[]
}

export interface NsgTrace {
  nsg: string
  attached: boolean
  checks: RuleCheck[]
  /** The rule that decided, if the NSG is attached. */
  decidedBy: NsgRule | null
  access: Access
}

/** Rules for one direction, custom and default, in the order Azure checks them. */
export const orderedRules = (nsg: Nsg, direction: Direction) =>
  [
    ...nsg.rules
      .filter((rule) => rule.direction === direction)
      .map((rule) => ({ rule, isDefault: false })),
    ...DEFAULT_RULES.filter((rule) => rule.direction === direction).map((rule) => ({
      rule,
      isDefault: true,
    })),
  ].sort((a, b) => a.rule.priority - b.rule.priority)

export function evaluateNsg(nsg: Nsg, packet: Packet, context: TagContext): NsgTrace {
  if (!nsg.attached)
    return { nsg: nsg.name, attached: false, checks: [], decidedBy: null, access: 'Allow' }
  const checks: RuleCheck[] = []
  for (const { rule, isDefault } of orderedRules(nsg, packet.direction)) {
    const protocolOk = rule.protocol === 'Any' || rule.protocol === packet.protocol
    const source = addressMatches(rule.source, packet.sourceIp, context)
    const sourcePort = portMatches(rule.sourcePorts, packet.sourcePort)
    const destination = addressMatches(rule.destination, packet.destinationIp, context)
    const destinationPort =
      packet.protocol === 'ICMP'
        ? { ok: true, why: 'ICMP has no ports' }
        : portMatches(rule.destinationPorts, packet.destinationPort)
    const criteria = [
      {
        label: 'Protocol',
        ok: protocolOk,
        why: protocolOk
          ? `${packet.protocol} matches ${rule.protocol}`
          : `${packet.protocol} is not ${rule.protocol}`,
      },
      { label: 'Source', ok: source.ok, why: source.why },
      {
        label: 'Source port',
        ok: sourcePort.ok || packet.protocol === 'ICMP',
        why: packet.protocol === 'ICMP' ? 'ICMP has no ports' : sourcePort.why,
      },
      { label: 'Destination', ok: destination.ok, why: destination.why },
      { label: 'Destination port', ok: destinationPort.ok, why: destinationPort.why },
    ]
    const matched = criteria.every((criterion) => criterion.ok)
    checks.push({ rule, isDefault, matched, criteria })
    if (matched)
      return { nsg: nsg.name, attached: true, checks, decidedBy: rule, access: rule.access }
  }
  // Unreachable: DenyAll matches everything.
  return { nsg: nsg.name, attached: true, checks, decidedBy: null, access: 'Deny' }
}

export interface FlowResult {
  /** In the order Azure evaluates them for this direction. */
  stages: NsgTrace[]
  access: Access
  /** The NSG that blocked the packet, if any. */
  blockedBy: string | null
}

/** Inbound: subnet NSG, then NIC NSG. Outbound: NIC NSG, then subnet NSG. */
export function evaluateFlow(
  subnetNsg: Nsg,
  nicNsg: Nsg,
  packet: Packet,
  context: TagContext,
): FlowResult {
  const order = packet.direction === 'Inbound' ? [subnetNsg, nicNsg] : [nicNsg, subnetNsg]
  const stages: NsgTrace[] = []
  for (const nsg of order) {
    const trace = evaluateNsg(nsg, packet, context)
    stages.push(trace)
    if (trace.access === 'Deny') return { stages, access: 'Deny', blockedBy: nsg.name }
  }
  return { stages, access: 'Allow', blockedBy: null }
}

/** Problems with a rule that Azure would reject. */
export function ruleProblems(rule: NsgRule, others: NsgRule[]): string[] {
  const problems: string[] = []
  if (!Number.isInteger(rule.priority) || rule.priority < 100 || rule.priority > 4096)
    problems.push('Priority must be 100-4096.')
  if (
    others.some(
      (other) =>
        other !== rule && other.direction === rule.direction && other.priority === rule.priority,
    )
  ) {
    problems.push(
      `Another ${rule.direction.toLowerCase()} rule already has priority ${rule.priority}.`,
    )
  }
  for (const [label, value] of [
    ['Source', rule.source],
    ['Destination', rule.destination],
  ] as const) {
    const spec = value.trim()
    if (spec === '*' || (SERVICE_TAGS as readonly string[]).includes(spec)) continue
    for (const part of spec.split(',')) {
      const parsed = parseCidr(part.includes('/') ? part.trim() : `${part.trim()}/32`)
      if (!isCidr(parsed)) problems.push(`${label} '${part.trim()}': ${parsed.error}`)
    }
  }
  for (const [label, value] of [
    ['Source ports', rule.sourcePorts],
    ['Destination ports', rule.destinationPorts],
  ] as const) {
    if (value.trim() === '*') continue
    if (
      !value
        .split(',')
        .every(
          (part) =>
            /^\s*\d{1,5}(\s*-\s*\d{1,5})?\s*$/.test(part) &&
            part.split('-').every((n) => Number(n) <= 65535),
        )
    ) {
      problems.push(
        `${label} '${value}' should be *, a port, a range (1000-2000) or a list (80,443).`,
      )
    }
  }
  return problems
}
