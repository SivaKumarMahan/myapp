/**
 * Composite SLA: services in series all have to be up (multiply the
 * availabilities); redundant paths in parallel fail only if all fail
 * (1 - product of the unavailabilities). Both assume independent failures,
 * and parallel assumes failover is automatic.
 */

export type SlaNode =
  | { kind: 'service'; service: string; sla?: number; label?: string }
  | { kind: 'series'; items: SlaNode[]; label?: string }
  | { kind: 'parallel'; items: SlaNode[]; label?: string }

export interface Service {
  id: string
  name: string
  /** Percent, e.g. 99.95. */
  sla: number
  condition?: string
}

/** 0-1 availability of a node. */
export function availability(node: SlaNode, services: Map<string, Service>): number {
  switch (node.kind) {
    case 'service':
      return (node.sla ?? services.get(node.service)?.sla ?? 100) / 100
    case 'series':
      return node.items.reduce((product, item) => product * availability(item, services), 1)
    case 'parallel':
      return node.items.length === 0
        ? 1
        : 1 - node.items.reduce((product, item) => product * (1 - availability(item, services)), 1)
  }
}

/** The average month (365.25 / 12 days) and year. */
export const MINUTES = { day: 1440, week: 10080, month: 43830, year: 525960 }

/** Allowed downtime in minutes for an availability (0-1) over a period. */
export const downtimeMinutes = (value: number, period: keyof typeof MINUTES) =>
  (1 - value) * MINUTES[period]

export function formatDuration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`
  if (minutes < 60) return `${minutes < 10 ? minutes.toFixed(1) : Math.round(minutes)} min`
  const hours = minutes / 60
  if (hours < 48) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} days`
}

/**
 * Enough decimals to tell the nines apart (99.94%, 99.99996%), and never
 * rounded up to a 100% the architecture does not have.
 */
export function formatPercent(value: number): string {
  if (value >= 1) return '100%'
  const percent = value * 100
  let decimals = Math.min(6, Math.max(2, Math.ceil(-Math.log10(1 - value)) - 1))
  while (decimals < 8 && Number(percent.toFixed(decimals)) >= 100) decimals += 1
  return `${percent.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '')}%`
}

/** How many nines, e.g. 99.95% -> 3.3 */
export const nines = (value: number) => (value >= 1 ? Infinity : -Math.log10(1 - value))
