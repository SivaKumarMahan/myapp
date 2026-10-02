import { isCidr, overlaps, parseCidr } from './cidr'

/**
 * VNet peering and reachability. Peering is non-transitive: A-B and B-C do
 * not connect A to C. Traffic between spokes only crosses a hub if the hub
 * runs a firewall or NVA, the spokes route to it (UDRs), and the peerings
 * allow forwarded traffic.
 */

export interface LabVnet {
  name: string
  addressSpace: string
  /** The hub forwards spoke-to-spoke traffic through Azure Firewall (with UDRs on the spokes). */
  firewall: boolean
}

/** One side of a peering: the link from `from` to `to`. Azure needs both sides. */
export interface PeeringLink {
  from: string
  to: string
  allowVirtualNetworkAccess: boolean
  allowForwardedTraffic: boolean
}

export interface Topology {
  vnets: LabVnet[]
  links: PeeringLink[]
}

export type PeeringState = 'Connected' | 'Initiated' | 'Invalid'

export interface PeeringStatus {
  a: string
  b: string
  state: PeeringState
  reason: string
}

const linkBetween = (topology: Topology, from: string, to: string) =>
  topology.links.find((link) => link.from === from && link.to === to)

export function peeringStatuses(topology: Topology): PeeringStatus[] {
  const pairs = new Map<string, [string, string]>()
  for (const link of topology.links) {
    const key = [link.from, link.to].sort().join('|')
    if (!pairs.has(key)) pairs.set(key, [link.from, link.to])
  }
  return [...pairs.values()].map(([a, b]) => {
    const vnetA = topology.vnets.find((vnet) => vnet.name === a)
    const vnetB = topology.vnets.find((vnet) => vnet.name === b)
    const rangeA = vnetA ? parseCidr(vnetA.addressSpace) : null
    const rangeB = vnetB ? parseCidr(vnetB.addressSpace) : null
    if (rangeA && rangeB && isCidr(rangeA) && isCidr(rangeB) && overlaps(rangeA, rangeB)) {
      return {
        a,
        b,
        state: 'Invalid' as const,
        reason: `${a} (${rangeA.text}) and ${b} (${rangeB.text}) overlap. Azure refuses to peer VNets whose address spaces overlap.`,
      }
    }
    const forward = linkBetween(topology, a, b)
    const back = linkBetween(topology, b, a)
    if (!forward || !back) {
      const missing = forward ? `${b} → ${a}` : `${a} → ${b}`
      return {
        a,
        b,
        state: 'Initiated' as const,
        reason: `Only one side exists. The peering stays Initiated - no traffic flows - until the ${missing} side is created too.`,
      }
    }
    return { a, b, state: 'Connected' as const, reason: 'Both sides exist: Connected.' }
  })
}

export interface Reachability {
  reachable: boolean
  path: string[]
  steps: string[]
}

const connected = (topology: Topology, a: string, b: string) =>
  peeringStatuses(topology).find(
    (status) => [status.a, status.b].sort().join('|') === [a, b].sort().join('|'),
  )

/** Can a VM in `from` reach a VM in `to`? With the reasoning. */
export function reach(topology: Topology, from: string, to: string): Reachability {
  if (from === to)
    return {
      reachable: true,
      path: [from],
      steps: [
        `Both VMs are in ${from}. Subnets in a VNet route to each other by default (system routes), so they can talk unless an NSG blocks it.`,
      ],
    }
  const steps: string[] = []
  const direct = connected(topology, from, to)
  if (direct) {
    if (direct.state !== 'Connected') {
      steps.push(`${from} and ${to} have a peering, but it is ${direct.state}. ${direct.reason}`)
    } else {
      const there = linkBetween(topology, from, to) as PeeringLink
      const back = linkBetween(topology, to, from) as PeeringLink
      if (!there.allowVirtualNetworkAccess || !back.allowVirtualNetworkAccess) {
        const off = !there.allowVirtualNetworkAccess ? `${from} → ${to}` : `${to} → ${from}`
        steps.push(
          `${from} and ${to} are peered, but "Allow access to the remote virtual network" is off on the ${off} side, so traffic is blocked.`,
        )
      } else {
        return {
          reachable: true,
          path: [from, to],
          steps: [
            `${from} and ${to} are peered directly and the peering is Connected, so they reach each other over the Microsoft backbone.`,
          ],
        }
      }
    }
  } else {
    steps.push(`${from} and ${to} are not peered with each other.`)
  }

  // Through a hub: A - H - B, with H routing between spokes.
  for (const hub of topology.vnets) {
    if (hub.name === from || hub.name === to) continue
    const left = connected(topology, from, hub.name)
    const right = connected(topology, hub.name, to)
    if (left?.state !== 'Connected' || right?.state !== 'Connected') continue
    if (!hub.firewall) {
      steps.push(
        `Both are peered with ${hub.name}, but peering is not transitive: ${from}–${hub.name} and ${hub.name}–${to} do not connect ${from} to ${to}. Peer them directly, or route through a firewall or NVA in ${hub.name}.`,
      )
      continue
    }
    const forwarded = [
      linkBetween(topology, from, hub.name),
      linkBetween(topology, to, hub.name),
    ].every((link) => link?.allowForwardedTraffic)
    if (!forwarded) {
      steps.push(
        `${hub.name} has a firewall, but the spoke-side peerings (${from} → ${hub.name}, ${to} → ${hub.name}) must allow forwarded traffic, or the spokes drop packets the firewall sends on.`,
      )
      continue
    }
    return {
      reachable: true,
      path: [from, hub.name, to],
      steps: [
        ...steps.filter((step) => !step.startsWith('Both are peered')),
        `Traffic goes ${from} → ${hub.name} (Azure Firewall) → ${to}: route tables on the spokes send the other spoke's range to the firewall, and the peerings allow forwarded traffic. This is the hub-and-spoke pattern.`,
      ],
    }
  }
  if (steps.length === 1 && steps[0].endsWith('not peered with each other.')) {
    steps.push(
      `There is no path between them: peer ${from} with ${to}, or connect both to a hub that routes between spokes.`,
    )
  }
  return { reachable: false, path: [], steps }
}
