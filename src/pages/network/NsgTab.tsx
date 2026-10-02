import { useEffect, useMemo, useState } from 'react'
import { netKey, nsgScenarios } from '../../content/netlab'
import {
  AZURE_LB_IP,
  evaluateFlow,
  orderedRules,
  ruleProblems,
  type Direction,
  type FlowResult,
  type Nsg,
  type NsgRule,
  type Packet,
} from '../../lib/netlab/nsg'
import { checkNsgScenario } from '../../lib/netlab/scenarios'
import { readJson, writeJson } from '../../lib/local-json'
import { useProgress } from '../../lib/use-progress'
import { Badge } from '../../components/ui/Badge'
import { ScenarioBrief, ScenarioPicker, Solved } from './shared'

const KEY = 'azure-learning-hub.netlab-nsg'
const VNET = ['10.0.0.0/16']
const WEB = '10.0.1.4'

const FREE: { subnet: Nsg; nic: Nsg } = {
  subnet: {
    name: 'nsg-snet-web',
    attached: true,
    rules: [
      {
        name: 'allow-https',
        priority: 100,
        direction: 'Inbound',
        access: 'Allow',
        protocol: 'TCP',
        source: 'Internet',
        sourcePorts: '*',
        destination: 'Any',
        destinationPorts: '443',
      },
    ],
  },
  nic: { name: 'nsg-vm-web', attached: false, rules: [] },
}

const PRESETS: { label: string; packet: Packet }[] = [
  {
    label: 'HTTPS from the Internet',
    packet: {
      direction: 'Inbound',
      protocol: 'TCP',
      sourceIp: '198.51.100.7',
      sourcePort: 51000,
      destinationIp: WEB,
      destinationPort: 443,
    },
  },
  {
    label: 'SSH from the office',
    packet: {
      direction: 'Inbound',
      protocol: 'TCP',
      sourceIp: '203.0.113.10',
      sourcePort: 52000,
      destinationIp: WEB,
      destinationPort: 22,
    },
  },
  {
    label: 'Another VM in the VNet',
    packet: {
      direction: 'Inbound',
      protocol: 'TCP',
      sourceIp: '10.0.2.4',
      sourcePort: 40000,
      destinationIp: WEB,
      destinationPort: 8080,
    },
  },
  {
    label: 'Load balancer probe',
    packet: {
      direction: 'Inbound',
      protocol: 'TCP',
      sourceIp: AZURE_LB_IP,
      sourcePort: 60000,
      destinationIp: WEB,
      destinationPort: 443,
    },
  },
  {
    label: 'VM calling the Internet',
    packet: {
      direction: 'Outbound',
      protocol: 'TCP',
      sourceIp: WEB,
      sourcePort: 50000,
      destinationIp: '20.50.2.10',
      destinationPort: 443,
    },
  },
  {
    label: 'Ping to the Internet',
    packet: {
      direction: 'Outbound',
      protocol: 'ICMP',
      sourceIp: WEB,
      sourcePort: 0,
      destinationIp: '8.8.8.8',
      destinationPort: 0,
    },
  },
]

const blankRule = (direction: Direction, rules: NsgRule[]): NsgRule => {
  const taken = new Set(
    rules.filter((rule) => rule.direction === direction).map((rule) => rule.priority),
  )
  let priority = 100
  while (taken.has(priority)) priority += 10
  return {
    name: `rule-${rules.length + 1}`,
    priority,
    direction,
    access: 'Allow',
    protocol: 'TCP',
    source: 'Any',
    sourcePorts: '*',
    destination: 'Any',
    destinationPorts: '80',
  }
}

function RuleEditor({
  nsg,
  onChange,
  direction,
  label,
  disabled,
}: {
  nsg: Nsg
  onChange: (next: Nsg) => void
  direction: Direction
  label: string
  disabled?: boolean
}) {
  const [showDefaults, setShowDefaults] = useState(false)
  const rules = nsg.rules
  const set = (index: number, patch: Partial<NsgRule>) =>
    onChange({
      ...nsg,
      rules: rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    })
  const visible = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => rule.direction === direction)
  return (
    <section className="card stack-sm" aria-label={label}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 className="card__title" style={{ margin: 0 }}>
          {label}: <span className="mono">{nsg.name}</span>
        </h3>
        <label className="net-toggle">
          <input
            type="checkbox"
            checked={nsg.attached}
            onChange={(event) => onChange({ ...nsg, attached: event.target.checked })}
            disabled={disabled}
          />
          Attached
        </label>
      </div>
      {!nsg.attached && (
        <p className="subtle" style={{ margin: 0 }}>
          Not attached: this layer lets everything through.
        </p>
      )}
      <div className="net-table__scroll">
        <table className="net-table net-table--rules">
          <thead>
            <tr>
              <th scope="col">Priority</th>
              <th scope="col">Name</th>
              <th scope="col">Source</th>
              <th scope="col">Src ports</th>
              <th scope="col">Destination</th>
              <th scope="col">Dest ports</th>
              <th scope="col">Protocol</th>
              <th scope="col">Action</th>
              <th scope="col">
                <span className="visually-hidden">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ rule, index }) => {
              const problems = ruleProblems(rule, rules)
              const field = (key: keyof NsgRule, width: string, mono = false) => (
                <input
                  className={`select${mono ? ' mono' : ''}`}
                  style={{ width }}
                  aria-label={`${rule.name} ${key}`}
                  value={String(rule[key])}
                  disabled={disabled}
                  onChange={(event) =>
                    set(index, {
                      [key]: key === 'priority' ? Number(event.target.value) : event.target.value,
                    } as Partial<NsgRule>)
                  }
                  spellCheck={false}
                />
              )
              return (
                <tr
                  key={index}
                  className={problems.length ? 'net-table__row--error' : ''}
                  title={problems.join(' ')}
                >
                  <td>{field('priority', '5.5rem')}</td>
                  <td>{field('name', '9rem')}</td>
                  <td>{field('source', '9rem', true)}</td>
                  <td>{field('sourcePorts', '5rem', true)}</td>
                  <td>{field('destination', '9rem', true)}</td>
                  <td>{field('destinationPorts', '6rem', true)}</td>
                  <td>
                    <select
                      className="select"
                      aria-label={`${rule.name} protocol`}
                      value={rule.protocol}
                      disabled={disabled}
                      onChange={(event) =>
                        set(index, { protocol: event.target.value as NsgRule['protocol'] })
                      }
                    >
                      {['Any', 'TCP', 'UDP', 'ICMP'].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="select"
                      aria-label={`${rule.name} action`}
                      value={rule.access}
                      disabled={disabled}
                      onChange={(event) =>
                        set(index, { access: event.target.value as NsgRule['access'] })
                      }
                    >
                      <option>Allow</option>
                      <option>Deny</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      aria-label={`Remove ${rule.name}`}
                      disabled={disabled}
                      onClick={() =>
                        onChange({ ...nsg, rules: rules.filter((_, i) => i !== index) })
                      }
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={9} className="subtle">
                  No custom {direction.toLowerCase()} rules.
                </td>
              </tr>
            )}
            {showDefaults &&
              orderedRules({ ...nsg, rules: [] }, direction).map(({ rule }) => (
                <tr key={rule.name} className="net-table__row--default">
                  <td>{rule.priority}</td>
                  <td>{rule.name}</td>
                  <td className="mono">{rule.source}</td>
                  <td className="mono">{rule.sourcePorts}</td>
                  <td className="mono">{rule.destination}</td>
                  <td className="mono">{rule.destinationPorts}</td>
                  <td>{rule.protocol}</td>
                  <td>{rule.access}</td>
                  <td>
                    <Badge>default</Badge>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {visible
        .flatMap(({ rule }) =>
          ruleProblems(rule, rules).map((problem) => `${rule.name}: ${problem}`),
        )
        .map((problem) => (
          <p key={problem} className="net-problem" role="alert">
            ✖ {problem}
          </p>
        ))}
      <div className="row">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          disabled={disabled}
          onClick={() => onChange({ ...nsg, rules: [...rules, blankRule(direction, rules)] })}
        >
          + Add {direction.toLowerCase()} rule
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setShowDefaults((value) => !value)}
          aria-expanded={showDefaults}
        >
          {showDefaults ? 'Hide' : 'Show'} default rules
        </button>
      </div>
    </section>
  )
}

/** How far through the trace the animation has got: [stage, rule]. */
type Cursor = { stage: number; rule: number } | 'done'

function FlowTrace({ flow, cursor }: { flow: FlowResult; cursor: Cursor }) {
  const reached = (stage: number, rule: number) =>
    cursor === 'done' || stage < cursor.stage || (stage === cursor.stage && rule <= cursor.rule)
  return (
    <ol className="nsg-trace">
      {flow.stages.map((stage, stageIndex) => (
        <li key={stage.nsg} className="nsg-trace__stage">
          <p className="nsg-trace__title">
            {stageIndex + 1}. <span className="mono">{stage.nsg}</span>{' '}
            {!stage.attached ? (
              <Badge>not attached - passes</Badge>
            ) : cursor === 'done' || stageIndex < cursor.stage ? (
              <Badge tone={stage.access === 'Allow' ? 'success' : 'danger'}>
                {stage.access === 'Allow' ? '✓ Allowed' : '✖ Denied'} by {stage.decidedBy?.name}
              </Badge>
            ) : null}
          </p>
          {stage.attached && (
            <ul className="nsg-trace__rules">
              {stage.checks.map((check, ruleIndex) => {
                if (!reached(stageIndex, ruleIndex)) return null
                const current =
                  cursor !== 'done' && cursor.stage === stageIndex && cursor.rule === ruleIndex
                const failed = check.criteria.find((criterion) => !criterion.ok)
                return (
                  <li
                    key={check.rule.name}
                    className={`nsg-trace__rule${check.matched ? ` nsg-trace__rule--${check.rule.access.toLowerCase()}` : ''}${current ? ' nsg-trace__rule--current' : ''}`}
                  >
                    <span className="nsg-trace__rule-head">
                      <span aria-hidden="true">
                        {check.matched ? (check.rule.access === 'Allow' ? '✓' : '✖') : '↓'}
                      </span>
                      <span className="mono">{check.rule.priority}</span> {check.rule.name}
                      {check.isDefault && <Badge>default</Badge>}
                      <span className="subtle">
                        {check.matched
                          ? `matches → ${check.rule.access}`
                          : `no match: ${failed?.why}`}
                      </span>
                    </span>
                    {(check.matched || current) && (
                      <ul className="nsg-trace__criteria">
                        {check.criteria.map((criterion) => (
                          <li
                            key={criterion.label}
                            className={criterion.ok ? 'cli-check--pass' : 'cli-check--todo'}
                          >
                            {criterion.ok ? '✓' : '✗'} {criterion.label}: {criterion.why}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}

export function NsgTab() {
  const { state } = useProgress()
  const [scenarioId, setScenarioId] = useState('')
  return (
    <div className="stack">
      <ScenarioPicker
        label="Scenario"
        value={scenarioId}
        onChange={setScenarioId}
        options={nsgScenarios.map((entry) => ({
          id: entry.id,
          title: entry.title,
          solved: Boolean(state.challenges[netKey('nsg', entry.id)]?.solvedAt),
        }))}
      />
      <NsgWorkspace key={scenarioId || 'free'} scenarioId={scenarioId} />
    </div>
  )
}

function NsgWorkspace({ scenarioId }: { scenarioId: string }) {
  const { state, recordChallengeCheck } = useProgress()
  const scenario = nsgScenarios.find((entry) => entry.id === scenarioId) ?? null
  const storage = `${KEY}.${scenarioId || 'free'}`
  const [nsgs, setNsgs] = useState(
    () =>
      readJson<{ subnet: Nsg; nic: Nsg } | null>(storage, null) ??
      (scenario ? { subnet: scenario.subnetNsg, nic: scenario.nicNsg } : FREE),
  )
  const [direction, setDirection] = useState<Direction>(
    scenario?.packets[0]?.packet.direction ?? 'Inbound',
  )
  const [packet, setPacket] = useState<Packet>(scenario?.packets[0]?.packet ?? PRESETS[0].packet)
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => writeJson(storage, nsgs), [storage, nsgs])

  const vnet = scenario?.vnet ?? VNET
  const flow = useMemo(
    () => evaluateFlow(nsgs.subnet, nsgs.nic, packet, { vnet }),
    [nsgs, packet, vnet],
  )
  const steps = flow.stages.flatMap((stage, stageIndex) =>
    stage.attached ? stage.checks.map((_, rule) => ({ stage: stageIndex, rule })) : [],
  )

  // Step through the rules one at a time; skipped for people who prefer less motion.
  useEffect(() => {
    if (!playing || cursor === null || cursor === 'done') return
    const index = steps.findIndex(
      (step) => step.stage === cursor.stage && step.rule === cursor.rule,
    )
    const timer = setTimeout(
      () => setCursor(index + 1 < steps.length ? steps[index + 1] : 'done'),
      650,
    )
    return () => clearTimeout(timer)
  }, [playing, cursor, steps])
  useEffect(() => {
    if (cursor === 'done') setPlaying(false)
  }, [cursor])

  const send = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || steps.length === 0) {
      setCursor('done')
      return
    }
    setCursor(steps[0])
    setPlaying(true)
  }
  const step = () => {
    if (cursor === null) return setCursor(steps[0] ?? 'done')
    if (cursor === 'done') return
    const index = steps.findIndex(
      (entry) => entry.stage === cursor.stage && entry.rule === cursor.rule,
    )
    setPlaying(false)
    setCursor(index + 1 < steps.length ? steps[index + 1] : 'done')
  }
  const changePacket = (next: Packet) => {
    setPacket(next)
    setCursor(null)
    setPlaying(false)
  }

  const result = scenario ? checkNsgScenario(scenario, nsgs.subnet.rules, nsgs.nic.rules) : null
  const key = scenario ? netKey('nsg', scenario.id) : ''
  useEffect(() => {
    if (scenario && result?.solved && !state.challenges[key]?.solvedAt)
      recordChallengeCheck(key, true)
  }, [scenario, result?.solved, key, state.challenges, recordChallengeCheck])

  return (
    <div className="stack">
      {scenario && result && (
        <ScenarioBrief exam={scenario.exam} brief={scenario.brief}>
          <ul className="cli-checks" aria-label="Test packets">
            {result.packets.map((entry) => (
              <li
                key={entry.label}
                className={entry.passed ? 'cli-check--pass' : 'cli-check--todo'}
              >
                <button
                  type="button"
                  className="net-packet-link"
                  onClick={() => {
                    setDirection(entry.packet.direction)
                    changePacket(entry.packet)
                  }}
                >
                  {entry.passed ? '✓' : '○'} {entry.label}: should be{' '}
                  <strong>{entry.expect}</strong>
                  {entry.passed ? '' : `, is ${entry.actual}`}
                </button>
              </li>
            ))}
          </ul>
          {result.problems.length > 0 && <p className="net-problem">Fix the rule errors first.</p>}
          {result.solved && <Solved text="Every packet gets the right answer." />}
        </ScenarioBrief>
      )}

      <div className="chip-row" role="group" aria-label="Rule direction">
        {(['Inbound', 'Outbound'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={direction === value}
            onClick={() => setDirection(value)}
          >
            {value} rules
          </button>
        ))}
      </div>
      <p className="subtle" style={{ margin: 0, fontSize: '0.875rem' }}>
        {direction === 'Inbound'
          ? 'Inbound traffic is checked by the subnet NSG first, then the NIC NSG.'
          : 'Outbound traffic is checked by the NIC NSG first, then the subnet NSG.'}{' '}
        Both must allow it.
      </p>
      <RuleEditor
        label="Subnet NSG"
        nsg={nsgs.subnet}
        direction={direction}
        onChange={(subnet) => setNsgs((current) => ({ ...current, subnet }))}
      />
      <RuleEditor
        label="NIC NSG"
        nsg={nsgs.nic}
        direction={direction}
        onChange={(nic) => setNsgs((current) => ({ ...current, nic }))}
      />

      <section className="card stack-sm" aria-labelledby="packet-heading">
        <h3 id="packet-heading" className="card__title" style={{ margin: 0 }}>
          Send a packet
        </h3>
        <div className="chip-row" aria-label="Example packets">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="chip"
              onClick={() => changePacket(preset.packet)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="net-packet">
          <label className="field">
            <span className="field__label">Direction</span>
            <select
              className="select"
              value={packet.direction}
              onChange={(event) =>
                changePacket({ ...packet, direction: event.target.value as Direction })
              }
            >
              <option>Inbound</option>
              <option>Outbound</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Protocol</span>
            <select
              className="select"
              value={packet.protocol}
              onChange={(event) =>
                changePacket({ ...packet, protocol: event.target.value as Packet['protocol'] })
              }
            >
              <option>TCP</option>
              <option>UDP</option>
              <option>ICMP</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Source IP</span>
            <input
              className="select mono"
              value={packet.sourceIp}
              onChange={(event) => changePacket({ ...packet, sourceIp: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Source port</span>
            <input
              className="select mono"
              inputMode="numeric"
              value={packet.sourcePort}
              onChange={(event) =>
                changePacket({ ...packet, sourcePort: Number(event.target.value) || 0 })
              }
            />
          </label>
          <label className="field">
            <span className="field__label">Destination IP</span>
            <input
              className="select mono"
              value={packet.destinationIp}
              onChange={(event) => changePacket({ ...packet, destinationIp: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">Destination port</span>
            <input
              className="select mono"
              inputMode="numeric"
              value={packet.destinationPort}
              onChange={(event) =>
                changePacket({ ...packet, destinationPort: Number(event.target.value) || 0 })
              }
            />
          </label>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={send}>
            ▶ Send packet
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={step}
            disabled={cursor === 'done'}
          >
            Step
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setPlaying(false)
              setCursor('done')
            }}
            disabled={cursor === 'done'}
          >
            Show all
          </button>
        </div>
        {cursor !== null && (
          <div className="stack-sm" aria-live="polite">
            <FlowTrace flow={flow} cursor={cursor} />
            {cursor === 'done' && (
              <div
                className={`notice notice--${flow.access === 'Allow' ? 'success' : 'danger'}`}
                role="status"
              >
                <span className="notice__icon" aria-hidden="true">
                  {flow.access === 'Allow' ? '✓' : '✖'}
                </span>
                <p style={{ margin: 0 }}>
                  <strong>
                    {flow.access === 'Allow' ? 'Allowed.' : `Denied by ${flow.blockedBy}.`}
                  </strong>{' '}
                  {flow.access === 'Allow'
                    ? 'Every NSG on the path allowed it.'
                    : 'The first NSG that denies a packet ends its journey; the next one never sees it.'}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
