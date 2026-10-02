import { useEffect, useMemo, useState } from 'react'
import { cidrScenarios, netKey } from '../../content/netlab'
import {
  RESERVED_SUBNETS,
  nextFree,
  toIp,
  type Cidr,
  type SubnetInput,
} from '../../lib/netlab/cidr'
import { checkCidrScenario, planFacts } from '../../lib/netlab/scenarios'
import { readJson, writeJson } from '../../lib/local-json'
import { useProgress } from '../../lib/use-progress'
import { Badge } from '../../components/ui/Badge'
import { Checklist, ScenarioBrief, ScenarioPicker, Solved } from './shared'

const KEY = 'azure-learning-hub.netlab-cidr'

/** The smallest aligned block that covers every range given (within the VNet). */
function coveringBlock(vnet: Cidr, ranges: Cidr[]): Cidr {
  if (ranges.length === 0) return vnet
  const start = Math.max(vnet.start, Math.min(...ranges.map((range) => range.start)))
  const end = Math.min(vnet.end, Math.max(...ranges.map((range) => range.end)))
  for (let prefix = 32; prefix >= vnet.prefix; prefix -= 1) {
    const size = 2 ** (32 - prefix)
    const base = start - (start % size)
    if (base + size - 1 >= end && base >= vnet.start) {
      return { text: `${toIp(base)}/${prefix}`, start: base, end: base + size - 1, prefix, size }
    }
  }
  return vnet
}
const FREE_START = {
  vnet: '10.0.0.0/16',
  subnets: [
    { name: 'snet-web', cidr: '10.0.1.0/24' },
    { name: 'snet-app', cidr: '10.0.2.0/24' },
    { name: 'AzureBastionSubnet', cidr: '10.0.255.0/26' },
  ],
}

/** Puts overlapping subnets on separate lanes so the overlap is visible. */
function lanes(ranges: { index: number; range: Cidr }[]) {
  const result: { index: number; range: Cidr }[][] = []
  for (const item of [...ranges].sort((a, b) => a.range.start - b.range.start)) {
    const lane = result.find((existing) =>
      existing.every(
        (other) => other.range.end < item.range.start || other.range.start > item.range.end,
      ),
    )
    if (lane) lane.push(item)
    else result.push([item])
  }
  return result
}

function AddressBar({
  vnet: whole,
  subnets,
  overlapping,
}: {
  vnet: Cidr
  subnets: { name: string; parsed: Cidr | null }[]
  overlapping: Set<number>
}) {
  const [zoomed, setZoomed] = useState(true)
  const placed = subnets
    .map((subnet) => subnet.parsed)
    .filter(
      (range): range is Cidr =>
        range !== null && range.end >= whole.start && range.start <= whole.end,
    )
  const inUse = coveringBlock(whole, placed)
  // Small subnets in a big VNet are slivers; show the part of the VNet in use.
  const canZoom = inUse.size * 4 <= whole.size
  const vnet = canZoom && zoomed ? inUse : whole
  const inside = subnets
    .map((subnet, index) => ({ index, range: subnet.parsed }))
    .filter(
      (item): item is { index: number; range: Cidr } =>
        item.range !== null && item.range.end >= vnet.start && item.range.start <= vnet.end,
    )
  const rows = lanes(inside)
  const position = (range: Cidr) => ({
    left: `${((Math.max(range.start, vnet.start) - vnet.start) / vnet.size) * 100}%`,
    width: `max(4px, ${((Math.min(range.end, vnet.end) - Math.max(range.start, vnet.start) + 1) / vnet.size) * 100}%)`,
  })
  return (
    <figure className="address-bar">
      <div className="address-bar__ends" aria-hidden="true">
        <span>{toIp(vnet.start)}</span>
        <span>{toIp(vnet.end)}</span>
      </div>
      <div
        className="address-bar__track"
        role="img"
        aria-label={`${whole.text}: ${inside.length} subnets placed. Details in the table.`}
      >
        {(rows.length ? rows : [[]]).map((row, laneIndex) => (
          <div key={laneIndex} className="address-bar__lane">
            {row.map(({ index, range }) => (
              <span
                key={index}
                className={`address-bar__block${overlapping.has(index) ? ' address-bar__block--overlap' : ''}`}
                style={{ ...position(range), background: `var(--series-${(index % 8) + 1})` }}
                title={`${subnets[index].name}: ${range.text} (${range.size.toLocaleString()} addresses)`}
              >
                <span className="address-bar__tag">{index + 1}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <figcaption className="subtle address-bar__caption">
        {vnet === whole
          ? `${whole.text} holds ${whole.size.toLocaleString()} addresses.`
          : `Showing ${vnet.text}, the part of ${whole.text} your subnets use (${Math.round((vnet.size / whole.size) * 1000) / 10}% of it).`}{' '}
        Each block is a subnet at its real position;
        {rows.length > 1
          ? ' blocks on a second row overlap the ones above them.'
          : ' gaps are free space.'}{' '}
        {canZoom && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setZoomed((value) => !value)}
          >
            {zoomed ? `Show all of ${whole.text}` : 'Zoom to the subnets'}
          </button>
        )}
      </figcaption>
    </figure>
  )
}

export function CidrTab() {
  const { state } = useProgress()
  const [scenarioId, setScenarioId] = useState('')
  return (
    <div className="stack">
      <ScenarioPicker
        label="Scenario"
        value={scenarioId}
        onChange={setScenarioId}
        options={cidrScenarios.map((entry) => ({
          id: entry.id,
          title: entry.title,
          solved: Boolean(state.challenges[netKey('cidr', entry.id)]?.solvedAt),
        }))}
      />
      {/* Re-keyed, so each scenario starts from its own saved plan. */}
      <CidrWorkspace key={scenarioId || 'free'} scenarioId={scenarioId} />
    </div>
  )
}

function CidrWorkspace({ scenarioId }: { scenarioId: string }) {
  const { state, recordChallengeCheck } = useProgress()
  const scenario = cidrScenarios.find((entry) => entry.id === scenarioId) ?? null
  const storage = `${KEY}.${scenarioId || 'free'}`
  const [initial] = useState(
    () =>
      readJson<{ vnet: string; subnets: SubnetInput[] } | null>(storage, null) ??
      (scenario ? scenario.start : FREE_START),
  )
  const [vnet, setVnet] = useState(initial.vnet)
  const [subnets, setSubnets] = useState<SubnetInput[]>(initial.subnets)
  const [prefix, setPrefix] = useState(24)

  useEffect(() => writeJson(storage, { vnet, subnets }), [storage, vnet, subnets])

  const { plan } = useMemo(() => planFacts(vnet, subnets), [vnet, subnets])
  const result = scenario ? checkCidrScenario(scenario, vnet, subnets) : null
  const key = scenario ? netKey('cidr', scenario.id) : ''
  useEffect(() => {
    if (scenario && result?.solved && !state.challenges[key]?.solvedAt)
      recordChallengeCheck(key, true)
  }, [scenario, result?.solved, key, state.challenges, recordChallengeCheck])

  const overlapping = new Set(
    plan.subnets.flatMap((subnet, index) => (subnet.overlapsWith.length ? [index] : [])),
  )
  const used = plan.subnets
    .map((subnet) => subnet.parsed)
    .filter((range): range is Cidr => range !== null)
  const suggestion = plan.vnet ? nextFree(plan.vnet, used, prefix) : null
  const update = (index: number, patch: Partial<SubnetInput>) =>
    setSubnets((current) =>
      current.map((subnet, i) => (i === index ? { ...subnet, ...patch } : subnet)),
    )
  const add = (name: string, cidr: string) => setSubnets((current) => [...current, { name, cidr }])

  return (
    <div className="stack">
      {scenario && result && (
        <ScenarioBrief exam={scenario.exam} brief={scenario.brief}>
          <Checklist items={result.requirements} />
          {result.solved && <Solved text="Plan approved." />}
        </ScenarioBrief>
      )}

      <div className="card stack-sm">
        <label className="field">
          <span className="field__label">VNet address space</span>
          <input
            className="select mono"
            value={vnet}
            onChange={(event) => setVnet(event.target.value)}
            spellCheck={false}
          />
        </label>
        {plan.vnet && (
          <AddressBar vnet={plan.vnet} subnets={plan.subnets} overlapping={overlapping} />
        )}

        <div className="net-table__scroll">
          <table className="net-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Address range</th>
                <th scope="col">Usable</th>
                <th scope="col">
                  <span className="visually-hidden">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {plan.subnets.map((subnet, index) => {
                const problems = plan.issues.filter((issue) => issue.subnet === index)
                return (
                  <tr
                    key={index}
                    className={
                      problems.some((issue) => issue.severity === 'error')
                        ? 'net-table__row--error'
                        : ''
                    }
                  >
                    <td>
                      <span
                        className="net-swatch"
                        style={{ background: `var(--series-${(index % 8) + 1})` }}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td>
                      <input
                        className="select"
                        aria-label={`Subnet ${index + 1} name`}
                        value={subnet.name}
                        onChange={(event) => update(index, { name: event.target.value })}
                        spellCheck={false}
                      />
                    </td>
                    <td>
                      <input
                        className="select mono"
                        aria-label={`Subnet ${index + 1} address range`}
                        value={subnet.cidr}
                        onChange={(event) => update(index, { cidr: event.target.value })}
                        spellCheck={false}
                      />
                    </td>
                    <td className="net-table__number">
                      {subnet.parsed ? subnet.usable.toLocaleString() : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-label={`Remove ${subnet.name || `subnet ${index + 1}`}`}
                        onClick={() =>
                          setSubnets((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="subtle" style={{ margin: 0, fontSize: '0.8125rem' }}>
          Usable = addresses minus the 5 Azure keeps in every subnet (network, gateway, two for DNS,
          broadcast).
        </p>

        <div className="net-add">
          <label className="field">
            <span className="field__label">Next free block</span>
            <select
              className="select"
              value={prefix}
              onChange={(event) => setPrefix(Number(event.target.value))}
            >
              {[20, 21, 22, 23, 24, 25, 26, 27, 28, 29].map((value) => (
                <option key={value} value={value}>
                  /{value} - {(2 ** (32 - value) - 5).toLocaleString()} usable
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={!suggestion}
            onClick={() => suggestion && add(`snet-${subnets.length + 1}`, suggestion.text)}
          >
            {suggestion ? `Add ${suggestion.text}` : 'No room'}
          </button>
        </div>
        <div className="chip-row" aria-label="Add a reserved subnet">
          {Object.entries(RESERVED_SUBNETS).map(([name, rule]) => {
            const block = plan.vnet
              ? nextFree(plan.vnet, used, rule.recommended ?? rule.minPrefix)
              : null
            return (
              <button
                key={name}
                type="button"
                className="chip"
                disabled={!block || subnets.some((subnet) => subnet.name === name)}
                onClick={() => block && add(name, block.text)}
                title={`${rule.service}: at least /${rule.minPrefix}`}
              >
                + {name}
              </button>
            )
          })}
        </div>
      </div>

      <section className="stack-sm" aria-label="Plan review">
        {plan.issues.length === 0 ? (
          <Badge tone="success">✓ No problems - this plan would deploy</Badge>
        ) : (
          <ul className="lab-findings">
            {plan.issues.map((issue, index) => (
              <li key={index} className={`lab-finding lab-finding--${issue.severity}`}>
                <div className="lab-finding__head">
                  <span className="lab-finding__icon" aria-hidden="true">
                    {issue.severity === 'error' ? '✖' : issue.severity === 'warning' ? '⚠' : 'ⓘ'}
                  </span>
                  <span className="lab-finding__title" style={{ cursor: 'default' }}>
                    <span className="visually-hidden">{issue.severity}: </span>
                    {issue.message}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {plan.free.length > 0 && (
          <p className="subtle" style={{ margin: 0 }}>
            Free:{' '}
            {plan.free
              .slice(0, 6)
              .map((range) => range.text)
              .join(', ')}
            {plan.free.length > 6 ? ` and ${plan.free.length - 6} more blocks` : ''}
          </p>
        )}
      </section>
    </div>
  )
}
