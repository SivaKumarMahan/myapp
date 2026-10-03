import { prop, type ArchNode, type Design, type ServiceType } from './model'

/**
 * Design review rules: the things an architect would flag in a whiteboard
 * review. Each looks only at node types, their properties and connections,
 * so designs stay simple to draw.
 */

export type Severity = 'error' | 'warning' | 'info'

export interface Finding {
  rule: string
  severity: Severity
  title: string
  detail: string
  fix: string
  nodes: string[]
}

const COMPUTE = new Set(['vm', 'appservice', 'aks'])
const PAAS_DATA = new Set(['sql', 'storage', 'keyvault'])
const NEEDS_SECRETS = new Set(['sql', 'storage'])
const MONITORED = new Set([
  'vm',
  'appservice',
  'aks',
  'sql',
  'storage',
  'keyvault',
  'appgw',
  'frontdoor',
])
const REGIONAL_WORKLOAD = new Set(['vm', 'appservice', 'aks', 'sql', 'storage'])

export const RULES: { id: string; title: string }[] = [
  { id: 'waf', title: 'No WAF on a public entry point' },
  { id: 'data-public', title: 'Data service reachable from the internet' },
  { id: 'private-endpoint', title: 'PaaS without a private endpoint' },
  { id: 'pe-vnet', title: 'Private endpoint outside a VNet' },
  { id: 'secrets', title: 'Secrets not in Key Vault' },
  { id: 'monitoring', title: 'No monitoring' },
  { id: 'backup', title: 'No backup' },
  { id: 'single-region', title: 'Single region' },
  { id: 'geo-data', title: 'Second region without a data copy' },
  { id: 'single-instance', title: 'Single instance' },
  { id: 'vnet', title: 'Compute outside a VNet' },
  { id: 'entry', title: 'No entry point' },
  { id: 'orphan', title: 'Unconnected service' },
]

export function review(design: Design, types: Map<string, ServiceType>): Finding[] {
  const { nodes, edges } = design
  const findings: Finding[] = []
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const neighbours = (id: string) =>
    edges
      .flatMap((edge) => (edge.from === id ? [edge.to] : edge.to === id ? [edge.from] : []))
      .map((other) => byId.get(other))
      .filter((node): node is ArchNode => Boolean(node))
  const linkedTo = (node: ArchNode, type: string) =>
    neighbours(node.id).some((other) => other.type === type)
  const of = (type: string) => nodes.filter((node) => node.type === type)
  const p = (node: ArchNode, key: string) => prop(node, key, types)
  const add = (finding: Finding) => findings.push(finding)

  // Public entry points: whatever the internet (Users) connects to directly.
  const users = of('users')
  const exposed = users.flatMap((user) =>
    edges.flatMap((edge) =>
      edge.from === user.id ? [edge.to] : edge.to === user.id ? [edge.from] : [],
    ),
  )
  const entryNodes = [...new Set(exposed)]
    .map((id) => byId.get(id))
    .filter((node): node is ArchNode => Boolean(node))
  for (const node of entryNodes) {
    if (PAAS_DATA.has(node.type)) {
      add({
        rule: 'data-public',
        severity: 'error',
        title: `${node.label} is reachable straight from the internet`,
        detail:
          'Users should reach your application, never the database, storage account or vault directly.',
        fix: 'Put the app tier in between, and give the data service a private endpoint with public access disabled.',
        nodes: [node.id],
      })
      continue
    }
    const protectedEntry =
      (node.type === 'frontdoor' && p(node, 'waf') === true) ||
      (node.type === 'appgw' && p(node, 'sku') === 'WAF_v2')
    if (!protectedEntry) {
      add({
        rule: 'waf',
        severity: 'error',
        title: `No WAF in front of ${node.label}`,
        detail:
          node.type === 'vm'
            ? 'A VM taking internet traffic directly exposes its ports - and RDP/SSH if they are open.'
            : 'Public traffic reaches it without a web application firewall to block OWASP-style attacks.',
        fix:
          node.type === 'frontdoor'
            ? 'Turn on a WAF policy on Front Door.'
            : node.type === 'appgw'
              ? 'Use the WAF_v2 SKU.'
              : 'Enter through Front Door (with WAF) or Application Gateway WAF_v2. Use Bastion for admin access to VMs.',
        nodes: [node.id],
      })
    }
  }
  if (users.length === 0 && nodes.length > 0) {
    add({
      rule: 'entry',
      severity: 'info',
      title: 'Where do users come in?',
      detail: 'Add Users / Internet and connect it to your entry point so the review can check it.',
      fix: 'Add a Users / Internet node.',
      nodes: [],
    })
  }

  // Private endpoints for PaaS data services.
  for (const node of nodes.filter((entry) => PAAS_DATA.has(entry.type))) {
    if (!linkedTo(node, 'pe')) {
      add({
        rule: 'private-endpoint',
        severity: 'warning',
        title: `${node.label} has no private endpoint`,
        detail: 'Without one, it is reached over its public endpoint - even from your own VNet.',
        fix: 'Connect a Private Endpoint (in a subnet of your VNet) and disable public network access.',
        nodes: [node.id],
      })
    }
  }
  for (const node of of('pe')) {
    if (!linkedTo(node, 'vnet')) {
      add({
        rule: 'pe-vnet',
        severity: 'warning',
        title: `${node.label} is not in a VNet`,
        detail: 'A private endpoint is a network interface in one of your subnets.',
        fix: 'Connect it to the VNet it lives in (and link the private DNS zone).',
        nodes: [node.id],
      })
    }
  }

  // Secrets: compute talking to data needs credentials or a managed identity + Key Vault.
  const kvPresent = of('keyvault').length > 0
  for (const node of nodes.filter((entry) => COMPUTE.has(entry.type))) {
    const talksToData = neighbours(node.id).some((other) => NEEDS_SECRETS.has(other.type))
    if (talksToData && !linkedTo(node, 'keyvault')) {
      add({
        rule: 'secrets',
        severity: 'warning',
        title: `Where does ${node.label} keep its secrets?`,
        detail: `It talks to a data service${kvPresent ? ' but is not connected to Key Vault' : ' and there is no Key Vault'}, so connection strings would sit in config or code.`,
        fix: 'Give it a managed identity, keep remaining secrets in Key Vault, and connect the two.',
        nodes: [node.id],
      })
    }
  }

  // Monitoring.
  const workspaces = of('loganalytics')
  const monitored = nodes.filter((node) => MONITORED.has(node.type))
  if (workspaces.length === 0 && monitored.length > 0) {
    add({
      rule: 'monitoring',
      severity: 'error',
      title: 'Nothing collects logs or metrics',
      detail:
        'Without a Log Analytics workspace there are no diagnostics, alerts or audit trail to troubleshoot with.',
      fix: 'Add Log Analytics and send diagnostic settings from each resource to it.',
      nodes: [],
    })
  } else if (workspaces.length > 0) {
    const unmonitored = monitored.filter((node) => !linkedTo(node, 'loganalytics'))
    if (unmonitored.length > 0) {
      add({
        rule: 'monitoring',
        severity: 'info',
        title: `${unmonitored.length} resource${unmonitored.length === 1 ? '' : 's'} not sending diagnostics`,
        detail: unmonitored.map((node) => node.label).join(', '),
        fix: 'Connect them to Log Analytics (diagnostic settings, Azure Monitor agent, Container insights).',
        nodes: unmonitored.map((node) => node.id),
      })
    }
  }

  // Backup.
  for (const node of of('vm')) {
    if (p(node, 'backup') !== true) {
      add({
        rule: 'backup',
        severity: 'error',
        title: `${node.label} is not backed up`,
        detail: 'VM disks are not backed up by default - a deleted or encrypted disk is gone.',
        fix: 'Protect it with Azure Backup in a Recovery Services vault.',
        nodes: [node.id],
      })
    }
  }
  for (const node of of('storage')) {
    if (p(node, 'softDelete') !== true) {
      add({
        rule: 'backup',
        severity: 'warning',
        title: `${node.label} has no soft delete`,
        detail: 'Redundancy copies deletes and overwrites too; it is not a backup.',
        fix: 'Turn on blob soft delete and versioning (and Azure Backup for blobs if needed).',
        nodes: [node.id],
      })
    }
  }

  // Regions.
  const regional = nodes.filter((node) => REGIONAL_WORKLOAD.has(node.type))
  const regions = new Set(regional.map((node) => node.region).filter(Boolean))
  if (regional.length > 0 && regions.size === 1) {
    add({
      rule: 'single-region',
      severity: 'warning',
      title: `Everything runs in ${[...regions][0]}`,
      detail:
        'A regional outage takes the whole workload down. Fine for many apps - not for a 99.99% target.',
      fix: 'Deploy the app tier to a second region behind Front Door, with a data copy there.',
      nodes: regional.map((node) => node.id),
    })
  }
  if (regions.size >= 2) {
    for (const region of regions) {
      const here = regional.filter((node) => node.region === region)
      const hasCompute = here.some((node) => COMPUTE.has(node.type))
      const hasData = here.some((node) => node.type === 'sql' || node.type === 'storage')
      const replicated = nodes.some(
        (node) =>
          (node.type === 'sql' && p(node, 'geoReplica') === true) ||
          (node.type === 'storage' && String(p(node, 'redundancy')).includes('GRS')),
      )
      if (hasCompute && !hasData && !replicated) {
        add({
          rule: 'geo-data',
          severity: 'warning',
          title: `${region} has an app tier but no copy of the data`,
          detail: 'If the primary region fails, this region has nothing to read from.',
          fix: 'Use a SQL failover group / geo-replica, or GRS/GZRS storage.',
          nodes: here.map((node) => node.id),
        })
      }
    }
  }

  // Redundancy inside a region.
  for (const node of nodes.filter((entry) => COMPUTE.has(entry.type))) {
    const count = Number(p(node, node.type === 'aks' ? 'nodeCount' : 'instances') ?? 1)
    if (count < 2) {
      add({
        rule: 'single-instance',
        severity: 'warning',
        title: `${node.label} runs on one instance`,
        detail: 'A host failure or platform update takes it offline.',
        fix:
          node.type === 'vm'
            ? 'Run two or more VMs across availability zones behind a load balancer.'
            : 'Run two or more instances, zone-redundant where available.',
        nodes: [node.id],
      })
    }
  }

  // Networking.
  for (const node of nodes.filter((entry) => entry.type === 'vm' || entry.type === 'aks')) {
    if (!linkedTo(node, 'vnet')) {
      add({
        rule: 'vnet',
        severity: 'info',
        title: `${node.label} is not shown in a VNet`,
        detail:
          'VMs and AKS nodes always live in a subnet; drawing it makes the private paths clear.',
        fix: 'Connect it to its VNet.',
        nodes: [node.id],
      })
    }
  }
  for (const node of nodes) {
    if (nodes.length > 1 && neighbours(node.id).length === 0) {
      add({
        rule: 'orphan',
        severity: 'info',
        title: `${node.label} is not connected`,
        detail: 'Connect it to what it talks to so the review can reason about it.',
        fix: 'Use Connect, then tap the two services.',
        nodes: [node.id],
      })
    }
  }

  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 }
  return findings.sort((a, b) => order[a.severity] - order[b.severity])
}

/* ---------- Scenarios ---------- */

export type Requirement =
  | { kind: 'noFindings'; rules: string[]; text: string }
  | { kind: 'hasType'; type: string; min: number; text: string }
  | { kind: 'regions'; min: number; text: string }
  | { kind: 'propOn'; type: string; key: string; value: PropValueLike; text: string }

type PropValueLike = string | number | boolean

export function requirementMet(
  requirement: Requirement,
  design: Design,
  types: Map<string, ServiceType>,
  findings = review(design, types),
): boolean {
  switch (requirement.kind) {
    case 'noFindings':
      return !findings.some(
        (finding) => requirement.rules.includes(finding.rule) && finding.severity !== 'info',
      )
    case 'hasType':
      return design.nodes.filter((node) => node.type === requirement.type).length >= requirement.min
    case 'regions':
      return (
        new Set(
          design.nodes
            .filter((node) => REGIONAL_WORKLOAD.has(node.type))
            .map((node) => node.region),
        ).size >= requirement.min
      )
    case 'propOn': {
      const matching = design.nodes.filter((node) => node.type === requirement.type)
      return (
        matching.length > 0 &&
        matching.every((node) => prop(node, requirement.key, types) === requirement.value)
      )
    }
  }
}

/** What the model answer has that yours does not: service counts by type. */
export function missingVersus(mine: Design, model: Design, types: Map<string, ServiceType>) {
  const count = (design: Design) => {
    const counts = new Map<string, number>()
    for (const node of design.nodes) counts.set(node.type, (counts.get(node.type) ?? 0) + 1)
    return counts
  }
  const have = count(mine)
  return [...count(model)]
    .filter(([type, n]) => (have.get(type) ?? 0) < n)
    .map(([type, n]) => ({
      type,
      name: types.get(type)?.name ?? type,
      model: n,
      mine: have.get(type) ?? 0,
    }))
}
