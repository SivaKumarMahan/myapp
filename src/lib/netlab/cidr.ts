/**
 * IPv4 address arithmetic and Azure's rules for VNets and subnets.
 */

export interface Cidr {
  text: string
  start: number
  end: number
  prefix: number
  size: number
}

export const toIp = (value: number) =>
  [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join('.')

export function parseIp(text: string): number | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text.trim())
  if (!match) return null
  const octets = match.slice(1).map(Number)
  if (octets.some((octet) => octet > 255)) return null
  return octets.reduce((sum, octet) => sum * 256 + octet, 0)
}

export type CidrError = { error: string; suggestion?: string }

/** Parses a network in CIDR form; host bits must be zero. */
export function parseCidr(text: string): Cidr | CidrError {
  const [address, prefixText] = text.trim().split('/')
  if (prefixText === undefined) return { error: 'Add a prefix length, e.g. /24.' }
  const ip = parseIp(address)
  const prefix = Number(prefixText)
  if (ip === null) return { error: `'${address}' is not an IPv4 address.` }
  if (!/^\d{1,2}$/.test(prefixText) || prefix > 32)
    return { error: `/${prefixText} is not a prefix length (0-32).` }
  const size = 2 ** (32 - prefix)
  if (ip % size !== 0) {
    const network = ip - (ip % size)
    return {
      error: `Host bits are set: the network is ${toIp(network)}/${prefix}.`,
      suggestion: `${toIp(network)}/${prefix}`,
    }
  }
  return { text: `${toIp(ip)}/${prefix}`, start: ip, end: ip + size - 1, prefix, size }
}

export const isCidr = (value: Cidr | CidrError): value is Cidr => 'start' in value

export const contains = (outer: Cidr, inner: Cidr) =>
  inner.start >= outer.start && inner.end <= outer.end
export const overlaps = (a: Cidr, b: Cidr) => a.start <= b.end && b.start <= a.end
export const containsIp = (range: Cidr, ip: number) => ip >= range.start && ip <= range.end

/** Azure keeps the first four and the last address of every subnet. */
export const AZURE_RESERVED = 5
export const usable = (cidr: Cidr) => Math.max(0, cidr.size - AZURE_RESERVED)

/** RFC 1918 private ranges, plus the shared CGNAT range Azure also allows. */
const PRIVATE = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '100.64.0.0/10'].map(
  (text) => parseCidr(text) as Cidr,
)
export const isPrivate = (cidr: Cidr) => PRIVATE.some((range) => contains(range, cidr))

/** Subnet names Azure services look for, and the smallest size each accepts. */
export const RESERVED_SUBNETS: Record<
  string,
  { minPrefix: number; recommended?: number; service: string }
> = {
  GatewaySubnet: { minPrefix: 29, recommended: 27, service: 'VPN and ExpressRoute gateways' },
  AzureBastionSubnet: { minPrefix: 26, service: 'Azure Bastion' },
  AzureFirewallSubnet: { minPrefix: 26, service: 'Azure Firewall' },
  AzureFirewallManagementSubnet: { minPrefix: 26, service: 'Azure Firewall forced tunnelling' },
  RouteServerSubnet: { minPrefix: 27, service: 'Azure Route Server' },
}

/** Names that look like a reserved subnet but are not it, so the service would not find them. */
const NEAR_MISSES: Record<string, RegExp> = {
  GatewaySubnet: /^(vpn|er|vnet)?[-_ ]?gateway[-_ ]?(subnet)?$/i,
  AzureBastionSubnet: /bastion/i,
  AzureFirewallSubnet: /^(azure)?[-_ ]?firewall[-_ ]?(subnet)?$/i,
  AzureFirewallManagementSubnet: /firewall[-_ ]?management/i,
  RouteServerSubnet: /route[-_ ]?server/i,
}

export interface SubnetInput {
  name: string
  cidr: string
}

export interface SubnetResult {
  name: string
  cidr: string
  parsed: Cidr | null
  usable: number
  /** Indexes of subnets this one overlaps. */
  overlapsWith: number[]
}

export interface PlanIssue {
  severity: 'error' | 'warning' | 'info'
  /** Index of the subnet, or -1 for the VNet itself. */
  subnet: number
  message: string
}

export interface PlanResult {
  vnet: Cidr | null
  subnets: SubnetResult[]
  issues: PlanIssue[]
  /** Unused ranges inside the VNet, largest aligned blocks. */
  free: Cidr[]
}

/** The largest aligned CIDR blocks that exactly cover [start, end]. */
export function blocks(start: number, end: number): Cidr[] {
  const result: Cidr[] = []
  let cursor = start
  while (cursor <= end) {
    let prefix = 32
    while (prefix > 0) {
      const size = 2 ** (32 - (prefix - 1))
      if (cursor % size !== 0 || cursor + size - 1 > end) break
      prefix -= 1
    }
    const size = 2 ** (32 - prefix)
    result.push({
      text: `${toIp(cursor)}/${prefix}`,
      start: cursor,
      end: cursor + size - 1,
      prefix,
      size,
    })
    cursor += size
  }
  return result
}

export function freeRanges(vnet: Cidr, used: Cidr[]): Cidr[] {
  const sorted = [...used]
    .filter((range) => overlaps(range, vnet))
    .sort((a, b) => a.start - b.start)
  const gaps: Cidr[] = []
  let cursor = vnet.start
  for (const range of sorted) {
    if (range.start > cursor) gaps.push(...blocks(cursor, range.start - 1))
    cursor = Math.max(cursor, range.end + 1)
  }
  if (cursor <= vnet.end) gaps.push(...blocks(cursor, vnet.end))
  return gaps
}

/** The first free, aligned block of the given size, if any. */
export function nextFree(vnet: Cidr, used: Cidr[], prefix: number): Cidr | null {
  const size = 2 ** (32 - prefix)
  if (prefix < vnet.prefix) return null
  for (let start = vnet.start; start + size - 1 <= vnet.end; start += size) {
    const candidate = {
      text: `${toIp(start)}/${prefix}`,
      start,
      end: start + size - 1,
      prefix,
      size,
    }
    if (!used.some((range) => overlaps(range, candidate))) return candidate
  }
  return null
}

/** Checks a VNet address space and its subnets the way Azure would. */
export function checkPlan(vnetText: string, inputs: SubnetInput[]): PlanResult {
  const issues: PlanIssue[] = []
  const parsedVnet = parseCidr(vnetText)
  let vnet: Cidr | null = null
  if (!isCidr(parsedVnet)) {
    issues.push({ severity: 'error', subnet: -1, message: `Address space: ${parsedVnet.error}` })
  } else {
    vnet = parsedVnet
    if (vnet.prefix < 8 || vnet.prefix > 29)
      issues.push({
        severity: 'error',
        subnet: -1,
        message: 'A VNet address space must be between /8 and /29.',
      })
    if (!isPrivate(vnet))
      issues.push({
        severity: 'warning',
        subnet: -1,
        message: `${vnet.text} is not a private range. Azure allows it, but traffic to the real owners of those public addresses would then stay in your VNet.`,
      })
  }

  const subnets: SubnetResult[] = inputs.map((input) => {
    const parsed = parseCidr(input.cidr)
    return {
      name: input.name,
      cidr: input.cidr,
      parsed: isCidr(parsed) ? parsed : null,
      usable: isCidr(parsed) ? usable(parsed) : 0,
      overlapsWith: [],
    }
  })

  const names = new Map<string, number>()
  subnets.forEach((subnet, index) => {
    const label = subnet.name || `Subnet ${index + 1}`
    const parsed = parseCidr(subnet.cidr)
    if (!subnet.name.trim())
      issues.push({ severity: 'error', subnet: index, message: 'Give the subnet a name.' })
    else if (names.has(subnet.name.toLowerCase()))
      issues.push({
        severity: 'error',
        subnet: index,
        message: `There is already a subnet called ${subnet.name}.`,
      })
    names.set(subnet.name.toLowerCase(), index)
    if (!isCidr(parsed)) {
      issues.push({ severity: 'error', subnet: index, message: `${label}: ${parsed.error}` })
      return
    }
    if (parsed.prefix > 29)
      issues.push({
        severity: 'error',
        subnet: index,
        message: `${label}: Azure's smallest subnet is a /29 (3 usable addresses). A /${parsed.prefix} cannot be created.`,
      })
    if (vnet && !contains(vnet, parsed))
      issues.push({
        severity: 'error',
        subnet: index,
        message: `${label}: ${parsed.text} is outside the VNet's address space ${vnet.text}.`,
      })

    const reserved = Object.entries(RESERVED_SUBNETS).find(([name]) => name === subnet.name)
    if (reserved) {
      const [name, rule] = reserved
      if (parsed.prefix > rule.minPrefix) {
        issues.push({
          severity: 'error',
          subnet: index,
          message: `${name} must be at least a /${rule.minPrefix} for ${rule.service} - ${parsed.text} is too small.`,
        })
      } else if (rule.recommended && parsed.prefix > rule.recommended) {
        issues.push({
          severity: 'warning',
          subnet: index,
          message: `${name} works as a /${parsed.prefix}, but Microsoft recommends a /${rule.recommended} or larger so you can add ExpressRoute or more gateway instances later.`,
        })
      }
    } else {
      const near = Object.entries(NEAR_MISSES).find(
        ([name, pattern]) => name !== subnet.name && pattern.test(subnet.name),
      )?.[0]
      if (near)
        issues.push({
          severity: 'warning',
          subnet: index,
          message: `${subnet.name} is not ${near}. ${RESERVED_SUBNETS[near].service} only uses a subnet named exactly ${near} (case-sensitive).`,
        })
    }
  })

  for (let a = 0; a < subnets.length; a += 1) {
    for (let b = a + 1; b < subnets.length; b += 1) {
      const x = subnets[a].parsed
      const y = subnets[b].parsed
      if (x && y && overlaps(x, y)) {
        subnets[a].overlapsWith.push(b)
        subnets[b].overlapsWith.push(a)
        issues.push({
          severity: 'error',
          subnet: b,
          message: `${subnets[b].name || `Subnet ${b + 1}`} (${y.text}) overlaps ${subnets[a].name || `Subnet ${a + 1}`} (${x.text}). Subnets in a VNet cannot share addresses.`,
        })
      }
    }
  }

  const used = subnets
    .map((subnet) => subnet.parsed)
    .filter((value): value is Cidr => value !== null)
  return { vnet, subnets, issues, free: vnet ? freeRanges(vnet, used) : [] }
}
