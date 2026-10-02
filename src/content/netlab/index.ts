import data from './scenarios.json'
import type { SubnetInput } from '../../lib/netlab/cidr'
import type { Nsg, NsgRule, Packet } from '../../lib/netlab/nsg'
import type { Topology } from '../../lib/netlab/peering'

/** Networking lab scenarios, from a JSON file. */

export interface CidrScenario {
  id: string
  title: string
  exam: string
  brief: string
  start: { vnet: string; subnets: SubnetInput[] }
  solution: { vnet: string; subnets: SubnetInput[] }
  requirements: { description: string; query: string }[]
}

export interface NsgScenario {
  id: string
  title: string
  exam: string
  brief: string
  vnet: string[]
  subnetNsg: Nsg
  nicNsg: Nsg
  packets: { label: string; packet: Packet; expect: 'Allow' | 'Deny' }[]
  solution: { subnetNsg: NsgRule[]; nicNsg: NsgRule[] }
}

export interface PeeringQuiz {
  id: string
  title: string
  exam: string
  brief: string
  topology: Topology
  questions: { from: string; to: string; answer: boolean }[]
}

export interface PeeringBuild {
  id: string
  title: string
  exam: string
  brief: string
  topology: Topology
  goal: { from: string; to: string }
  solution: Topology
}

const typed = data as unknown as {
  cidr: CidrScenario[]
  nsg: NsgScenario[]
  peering: PeeringQuiz[]
  build: PeeringBuild[]
}
export const cidrScenarios = typed.cidr
export const nsgScenarios = typed.nsg
export const peeringQuizzes = typed.peering
export const peeringBuilds = typed.build
export const netKey = (kind: 'cidr' | 'nsg' | 'peering' | 'build', id: string) =>
  `net:${kind}:${id}`
export const allNetKeys = [
  ...cidrScenarios.map((s) => netKey('cidr', s.id)),
  ...nsgScenarios.map((s) => netKey('nsg', s.id)),
  ...peeringQuizzes.map((s) => netKey('peering', s.id)),
  ...peeringBuilds.map((s) => netKey('build', s.id)),
]
