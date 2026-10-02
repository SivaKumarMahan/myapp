import jmespath from 'jmespath'
import type { CidrScenario, NsgScenario } from '../../content/netlab'
import { checkPlan, type SubnetInput } from './cidr'
import { evaluateFlow, ruleProblems, type NsgRule } from './nsg'

/** The facts a CIDR scenario's requirements are written against. */
export function planFacts(vnet: string, subnets: SubnetInput[]) {
  const plan = checkPlan(vnet, subnets)
  return {
    plan,
    facts: {
      vnet: plan.vnet ? { cidr: plan.vnet.text, prefix: plan.vnet.prefix } : null,
      subnets: plan.subnets.map((subnet) => ({
        name: subnet.name,
        cidr: subnet.cidr,
        prefix: subnet.parsed?.prefix ?? null,
        usable: subnet.usable,
      })),
      errors: plan.issues.filter((issue) => issue.severity === 'error').length,
      warnings: plan.issues.filter((issue) => issue.severity === 'warning').length,
    },
  }
}

export function checkCidrScenario(scenario: CidrScenario, vnet: string, subnets: SubnetInput[]) {
  const { facts } = planFacts(vnet, subnets)
  const requirements = scenario.requirements.map((requirement) => {
    let passed = false
    try {
      passed = jmespath.search(facts as never, requirement.query) === true
    } catch {
      passed = false
    }
    return { description: requirement.description, passed }
  })
  return { requirements, solved: requirements.every((requirement) => requirement.passed) }
}

export function checkNsgScenario(
  scenario: NsgScenario,
  subnetRules: NsgRule[],
  nicRules: NsgRule[],
) {
  const subnetNsg = { ...scenario.subnetNsg, rules: subnetRules }
  const nicNsg = { ...scenario.nicNsg, rules: nicRules }
  const problems = [
    ...subnetRules.flatMap((rule) => ruleProblems(rule, subnetRules)),
    ...nicRules.flatMap((rule) => ruleProblems(rule, nicRules)),
  ]
  const packets = scenario.packets.map((entry) => {
    const flow = evaluateFlow(subnetNsg, nicNsg, entry.packet, { vnet: scenario.vnet })
    return { ...entry, actual: flow.access, passed: flow.access === entry.expect, flow }
  })
  return {
    packets,
    problems,
    solved: problems.length === 0 && packets.every((entry) => entry.passed),
  }
}
