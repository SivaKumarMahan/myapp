import { describe, expect, it } from 'vitest'
import { cidrScenarios, nsgScenarios, peeringBuilds, peeringQuizzes } from '../../content/netlab'
import { checkPlan, freeRanges, nextFree, parseCidr, type Cidr } from './cidr'
import { DEFAULT_RULES, evaluateFlow, type Nsg, type Packet } from './nsg'
import { peeringStatuses, reach } from './peering'
import { checkCidrScenario, checkNsgScenario } from './scenarios'

const cidr = (text: string) => parseCidr(text) as Cidr

describe('CIDR rules', () => {
  it('parses networks and spots host bits', () => {
    expect(cidr('10.0.0.0/16')).toMatchObject({ prefix: 16, size: 65536 })
    expect(parseCidr('10.0.1.5/24')).toEqual({
      error: 'Host bits are set: the network is 10.0.1.0/24.',
      suggestion: '10.0.1.0/24',
    })
    expect(parseCidr('10.0.0.0')).toMatchObject({ error: expect.stringMatching(/prefix/) })
  })

  it('applies Azure subnet rules', () => {
    const plan = checkPlan('10.0.0.0/22', [
      { name: 'snet-a', cidr: '10.0.0.0/24' },
      { name: 'snet-b', cidr: '10.0.0.128/25' },
      { name: 'AzureBastionSubnet', cidr: '10.0.1.0/27' },
      { name: 'snet-tiny', cidr: '10.0.2.0/30' },
      { name: 'snet-out', cidr: '10.0.8.0/24' },
      { name: 'BastionSubnet', cidr: '10.0.3.0/26' },
      { name: 'AppGatewaySubnet', cidr: '10.0.3.64/26' },
    ])
    const text = plan.issues.map((issue) => issue.message).join('\n')
    expect(text).toMatch(/snet-b \(10\.0\.0\.128\/25\) overlaps snet-a/)
    expect(text).toMatch(/AzureBastionSubnet must be at least a \/26/)
    expect(text).toMatch(/smallest subnet is a \/29/)
    expect(text).toMatch(/outside the VNet/)
    expect(text).toMatch(/BastionSubnet is not AzureBastionSubnet/)
    // An Application Gateway subnet is not a misspelt GatewaySubnet.
    expect(text).not.toMatch(/AppGatewaySubnet is not/)
    expect(plan.subnets[0].usable).toBe(251)
  })

  it('finds free space and the next free block', () => {
    const vnet = cidr('10.0.0.0/22')
    const used = [cidr('10.0.0.0/24'), cidr('10.0.2.0/24')]
    expect(freeRanges(vnet, used).map((range) => range.text)).toEqual([
      '10.0.1.0/24',
      '10.0.3.0/24',
    ])
    expect(nextFree(vnet, used, 25)?.text).toBe('10.0.1.0/25')
    expect(nextFree(vnet, [vnet], 24)).toBeNull()
  })
})

describe('NSG evaluation', () => {
  const nsg = (name: string, rules: Nsg['rules'], attached = true): Nsg => ({
    name,
    attached,
    rules,
  })
  const inbound = (port: number, source = '198.51.100.7'): Packet => ({
    direction: 'Inbound',
    protocol: 'TCP',
    sourceIp: source,
    sourcePort: 50000,
    destinationIp: '10.0.1.4',
    destinationPort: port,
  })
  const context = { vnet: ['10.0.0.0/16'] }

  it('falls through to the default rules', () => {
    const flow = evaluateFlow(nsg('subnet', []), nsg('nic', [], false), inbound(443), context)
    expect(flow.access).toBe('Deny')
    expect(flow.stages[0].decidedBy?.name).toBe('DenyAllInBound')
    expect(flow.stages[0].checks.map((check) => check.rule.name)).toEqual([
      'AllowVnetInBound',
      'AllowAzureLoadBalancerInBound',
      'DenyAllInBound',
    ])
    expect(
      evaluateFlow(nsg('subnet', []), nsg('nic', [], false), inbound(443, '10.0.2.4'), context)
        .access,
    ).toBe('Allow')
    expect(DEFAULT_RULES).toHaveLength(6)
  })

  it('checks lowest priority first and stops at the first match', () => {
    const rules: Nsg['rules'] = [
      {
        name: 'deny-https',
        priority: 200,
        direction: 'Inbound',
        access: 'Deny',
        protocol: 'TCP',
        source: 'Any',
        sourcePorts: '*',
        destination: 'Any',
        destinationPorts: '443',
      },
      {
        name: 'allow-https',
        priority: 100,
        direction: 'Inbound',
        access: 'Allow',
        protocol: 'TCP',
        source: 'Internet',
        sourcePorts: '*',
        destination: 'Any',
        destinationPorts: '80,443',
      },
    ]
    const flow = evaluateFlow(nsg('subnet', rules), nsg('nic', [], false), inbound(443), context)
    expect(flow.stages[0].decidedBy?.name).toBe('allow-https')
    expect(flow.stages[0].checks).toHaveLength(1)
  })

  it('needs both NSGs to allow, subnet first for inbound and NIC first for outbound', () => {
    const allowAll: Nsg['rules'] = [
      {
        name: 'allow',
        priority: 100,
        direction: 'Inbound',
        access: 'Allow',
        protocol: 'Any',
        source: 'Any',
        sourcePorts: '*',
        destination: 'Any',
        destinationPorts: '*',
      },
    ]
    const flow = evaluateFlow(nsg('subnet', allowAll), nsg('nic', []), inbound(443), context)
    expect(flow.stages.map((stage) => stage.nsg)).toEqual(['subnet', 'nic'])
    expect(flow).toMatchObject({ access: 'Deny', blockedBy: 'nic' })
    const out = evaluateFlow(
      nsg('subnet', []),
      nsg('nic', []),
      { ...inbound(443), direction: 'Outbound', sourceIp: '10.0.1.4', destinationIp: '20.1.2.3' },
      context,
    )
    expect(out.stages.map((stage) => stage.nsg)).toEqual(['nic', 'subnet'])
    expect(out.access).toBe('Allow')
  })
})

describe('peering', () => {
  it('is not transitive, and needs both sides', () => {
    const topology = peeringQuizzes[0].topology
    expect(reach(topology, 'vnet-spoke1', 'vnet-spoke2')).toMatchObject({ reachable: false })
    expect(reach(topology, 'vnet-spoke1', 'vnet-spoke2').steps.join(' ')).toMatch(/not transitive/)
    const oneSided = peeringQuizzes[1].topology
    expect(peeringStatuses(oneSided).find((status) => status.b === 'vnet-spoke2')?.state).toBe(
      'Initiated',
    )
  })

  it('refuses overlapping address spaces', () => {
    expect(peeringStatuses(peeringQuizzes[3].topology)[0].state).toBe('Invalid')
  })
})

describe('scenarios', () => {
  it.each(cidrScenarios.map((scenario) => [scenario.id, scenario] as const))(
    'cidr %s: unsolved at the start, solved by the solution',
    (_id, scenario) => {
      expect(checkCidrScenario(scenario, scenario.start.vnet, scenario.start.subnets).solved).toBe(
        false,
      )
      const solved = checkCidrScenario(scenario, scenario.solution.vnet, scenario.solution.subnets)
      expect(solved.requirements.filter((requirement) => !requirement.passed)).toEqual([])
    },
  )

  it.each(nsgScenarios.map((scenario) => [scenario.id, scenario] as const))(
    'nsg %s: unsolved at the start, solved by the solution',
    (_id, scenario) => {
      expect(
        checkNsgScenario(scenario, scenario.subnetNsg.rules, scenario.nicNsg.rules).solved,
      ).toBe(false)
      const result = checkNsgScenario(
        scenario,
        scenario.solution.subnetNsg,
        scenario.solution.nicNsg,
      )
      expect(result.problems).toEqual([])
      expect(
        result.packets
          .filter((entry) => !entry.passed)
          .map((entry) => `${entry.label}: ${entry.actual}`),
      ).toEqual([])
    },
  )

  it.each(peeringQuizzes.map((quiz) => [quiz.id, quiz] as const))(
    'peering %s: every answer matches the engine',
    (_id, quiz) => {
      for (const question of quiz.questions) {
        expect(
          reach(quiz.topology, question.from, question.to).reachable,
          `${question.from} → ${question.to}`,
        ).toBe(question.answer)
      }
    },
  )

  it.each(peeringBuilds.map((build) => [build.id, build] as const))(
    'build %s: unsolved at the start, solved by the solution',
    (_id, build) => {
      expect(reach(build.topology, build.goal.from, build.goal.to).reachable).toBe(false)
      expect(reach(build.solution, build.goal.from, build.goal.to).reachable).toBe(true)
    },
  )
})
