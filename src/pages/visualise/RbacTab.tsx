import { useEffect, useMemo, useState } from 'react'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { RichText } from '../../components/ui/RichText'
import { rbacExercises, rbacModel, vizKey } from '../../content/visualise'
import {
  ancestry,
  appliesAt,
  evaluate,
  identities,
  policiesAt,
  type Outcome,
  type PolicyEffect,
  type RequestProps,
  type RoleAssignment,
  type ScopeNode,
} from '../../lib/visualise/rbac'
import { useProgress } from '../../lib/use-progress'

const TYPE_ICON: Record<ScopeNode['type'], string> = {
  tenant: '🏢',
  mg: '🗂️',
  subscription: '🔑',
  rg: '📦',
  resource: '▫️',
}
const TYPE_LABEL: Record<ScopeNode['type'], string> = {
  tenant: 'Root management group',
  mg: 'Management group',
  subscription: 'Subscription',
  rg: 'Resource group',
  resource: 'Resource',
}
const RESOURCE_ICON: Record<string, string> = {
  'Microsoft.Compute/virtualMachines': '🖥️',
  'Microsoft.Storage/storageAccounts': '🗄️',
  'Microsoft.KeyVault/vaults': '🔐',
  'Microsoft.Network/virtualNetworks': '🌐',
  'Microsoft.Network/azureFirewalls': '🧱',
  'Microsoft.Sql/servers': '🛢️',
  'Microsoft.Web/sites': '🌍',
}
const EFFECT_TONE: Record<PolicyEffect, BadgeTone> = {
  deny: 'danger',
  audit: 'warning',
  auditIfNotExists: 'warning',
  modify: 'info',
  append: 'info',
  deployIfNotExists: 'info',
  disabled: 'neutral',
}
const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'allowed', label: 'Allowed' },
  { id: 'denied-rbac', label: 'Blocked: no role allows it' },
  { id: 'denied-deny', label: 'Blocked: deny assignment' },
  { id: 'denied-policy', label: 'Blocked: Azure Policy' },
]

const nodeName = (id: string) => rbacModel.nodes.find((node) => node.id === id)?.name ?? id
const principalName = (id: string) =>
  rbacModel.principals.find((entry) => entry.id === id)?.name ?? id
const roleName = (id: string) => rbacModel.roles.find((role) => role.id === id)?.name ?? id

function depth(node: ScopeNode) {
  return ancestry(rbacModel.nodes, node.id).length - 1
}

/** Nodes in tree order (parents before children). */
function treeOrder(): ScopeNode[] {
  const out: ScopeNode[] = []
  const visit = (parent: string | undefined) => {
    for (const node of rbacModel.nodes.filter((entry) => entry.parent === parent)) {
      out.push(node)
      visit(node.id)
    }
  }
  visit(undefined)
  return out
}

/**
 * RBAC scope explorer: the management group hierarchy, who has which role
 * where (and what inherits it), deny assignments and Azure Policy side by
 * side, and a request you can evaluate step by step.
 */
export function RbacTab() {
  const { state, recordChallengeCheck } = useProgress()
  const nodes = useMemo(treeOrder, [])
  const [assignments, setAssignments] = useState<RoleAssignment[]>(rbacModel.assignments)
  const model = useMemo(() => ({ ...rbacModel, assignments }), [assignments])
  const [principal, setPrincipal] = useState('alice')
  const [selected, setSelected] = useState('rg-pay-app')
  const [focus, setFocus] = useState<string | null>(null)
  const [newRole, setNewRole] = useState('reader')
  const [newPrincipal, setNewPrincipal] = useState('carol')

  // Request tester
  const [action, setAction] = useState('vm-restart')
  const actionDef = rbacModel.actions.find((entry) => entry.id === action)
  const targets = nodes.filter(
    (node) =>
      actionDef?.targets.includes(node.type) &&
      (!actionDef.on || node.resourceType === actionDef.on),
  )
  const [target, setTarget] = useState('vm-pay-01')
  const [props, setProps] = useState<RequestProps>({ location: 'westeurope' })
  const [exerciseId, setExerciseId] = useState('')
  const [prediction, setPrediction] = useState<Outcome | null>(null)

  useEffect(() => {
    if (!targets.some((node) => node.id === target) && targets[0]) setTarget(targets[0].id)
  }, [targets, target])

  const exercise = rbacExercises.find((entry) => entry.id === exerciseId)
  const loadExercise = (id: string) => {
    setExerciseId(id)
    setPrediction(null)
    const found = rbacExercises.find((entry) => entry.id === id)
    if (!found) return
    setAssignments(rbacModel.assignments)
    setPrincipal(found.principal)
    setAction(found.action)
    setTarget(found.target)
    setProps({ location: 'westeurope', ...found.props })
    setSelected(found.target)
  }

  const result = evaluate(model, principal, action, target, actionDef?.write ? props : {})
  const who = identities(model, principal)
  const focused = assignments.find((assignment) => assignment.id === focus)

  const predict = (outcome: Outcome) => {
    setPrediction(outcome)
    if (exercise && outcome === exercise.expected) {
      const key = vizKey('rbac', exercise.id)
      if (!state.challenges[key]?.solvedAt) recordChallengeCheck(key, true)
    }
  }
  const showResult = !exercise || prediction !== null

  const here = assignments.filter((assignment) =>
    appliesAt(rbacModel.nodes, assignment.scope, selected),
  )
  const selectedNode = rbacModel.nodes.find((node) => node.id === selected)
  const allPolicies = rbacModel.policies.filter((policy) =>
    appliesAt(rbacModel.nodes, policy.scope, selected),
  )
  const inForce = new Set(policiesAt(model, selected).map((policy) => policy.id))
  const denies = rbacModel.denyAssignments.filter((deny) =>
    appliesAt(rbacModel.nodes, deny.scope, selected),
  )

  return (
    <div className="stack">
      <section className="card stack-sm" aria-labelledby="rbac-predict">
        <h2 id="rbac-predict" className="card__title">
          Predict the outcome
        </h2>
        <label className="field">
          <span className="field__label">Exercise</span>
          <select
            className="select"
            value={exerciseId}
            onChange={(event) => loadExercise(event.target.value)}
          >
            <option value="">Free play</option>
            {rbacExercises.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {state.challenges[vizKey('rbac', entry.id)]?.solvedAt ? '✓ ' : ''}
                {entry.title}
              </option>
            ))}
          </select>
        </label>
        {exercise && (
          <>
            <p style={{ margin: 0 }}>
              <strong>{principalName(exercise.principal)}</strong> tries to{' '}
              <strong>{actionDef?.label.toLowerCase()}</strong> on{' '}
              <strong>{nodeName(exercise.target)}</strong>
              {Object.keys(exercise.props).length > 0 &&
                ` (${Object.entries(exercise.props)
                  .map(([key, value]) => `${key}: ${String(value)}`)
                  .join(', ')})`}
              . What happens?
            </p>
            <div className="chip-row" role="group" aria-label="Your prediction">
              {OUTCOMES.map((outcome) => (
                <button
                  key={outcome.id}
                  type="button"
                  className="chip"
                  aria-pressed={prediction === outcome.id}
                  onClick={() => predict(outcome.id)}
                >
                  {outcome.label}
                </button>
              ))}
            </div>
            {prediction && (
              <p role="status" className={prediction === exercise.expected ? 'viz-ok' : 'viz-bad'}>
                {prediction === exercise.expected
                  ? '✓ Correct. '
                  : `✗ Not quite - it is "${OUTCOMES.find((o) => o.id === exercise.expected)?.label}". `}
                <RichText text={exercise.explanation} />
              </p>
            )}
          </>
        )}
      </section>

      <div className="viz-split">
        <section className="card stack-sm" aria-labelledby="rbac-tree">
          <h2 id="rbac-tree" className="card__title">
            Scope hierarchy
          </h2>
          <label className="field">
            <span className="field__label">Show access for</span>
            <select
              className="select"
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
            >
              {rbacModel.principals.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} · {entry.kind}
                </option>
              ))}
            </select>
          </label>
          <ul
            className="rbac-tree"
            aria-label="Management groups, subscriptions, resource groups and resources"
          >
            {nodes.map((node) => {
              const direct = assignments.filter(
                (a) => a.scope === node.id && who.includes(a.principal),
              )
              const inherited = assignments.filter(
                (a) =>
                  a.scope !== node.id &&
                  who.includes(a.principal) &&
                  appliesAt(rbacModel.nodes, a.scope, node.id),
              )
              const denied = rbacModel.denyAssignments.some(
                (deny) =>
                  appliesAt(rbacModel.nodes, deny.scope, node.id) &&
                  !(deny.excludePrincipals ?? []).some((excluded) => who.includes(excluded)),
              )
              const policyCount = rbacModel.policies.filter(
                (policy) => policy.scope === node.id,
              ).length
              const inFocus = focused && appliesAt(rbacModel.nodes, focused.scope, node.id)
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    className={`rbac-node${node.id === selected ? ' is-selected' : ''}${inFocus ? ' is-focus' : ''}${direct.length || inherited.length ? ' has-access' : ''}`}
                    style={{ paddingLeft: `${0.5 + depth(node) * 0.9}rem` }}
                    aria-pressed={node.id === selected}
                    onClick={() => setSelected(node.id)}
                  >
                    <span aria-hidden="true">
                      {node.resourceType
                        ? (RESOURCE_ICON[node.resourceType] ?? '▫️')
                        : TYPE_ICON[node.type]}
                    </span>
                    <span className="rbac-node__name">{node.name}</span>
                    <span className="rbac-node__badges">
                      {direct.map((a) => (
                        <span
                          key={a.id}
                          className="rbac-role rbac-role--direct"
                          title="Assigned here"
                        >
                          {roleName(a.role)}
                        </span>
                      ))}
                      {direct.length === 0 && inherited.length > 0 && (
                        <span className="rbac-role" title="Inherited from above">
                          ↓ {[...new Set(inherited.map((a) => roleName(a.role)))].join(', ')}
                        </span>
                      )}
                      {denied && (
                        <span className="rbac-flag" title="A deny assignment applies here">
                          🚫
                        </span>
                      )}
                      {policyCount > 0 && (
                        <span
                          className="rbac-flag"
                          title={`${policyCount} policy assignment(s) here`}
                        >
                          📜{policyCount}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="subtle" style={{ margin: 0 }}>
            Solid = assigned here · ↓ = inherited · 🚫 deny assignment · 📜 policies assigned here.
            {focused &&
              ` Highlighted: everything ${roleName(focused.role)} for ${principalName(focused.principal)} reaches.`}
          </p>
        </section>

        <section className="stack-sm" aria-labelledby="rbac-here">
          <h2 id="rbac-here" className="viz-subtitle">
            {selectedNode && TYPE_ICON[selectedNode.type]} {selectedNode?.name}{' '}
            <span className="subtle">· {selectedNode && TYPE_LABEL[selectedNode.type]}</span>
          </h2>
          <div className="viz-side-by-side">
            <div className="card stack-sm">
              <h3 className="card__title">Role assignments in effect</h3>
              <ul className="viz-list">
                {here.map((assignment) => (
                  <li key={assignment.id}>
                    <button
                      type="button"
                      className="linklike"
                      aria-pressed={focus === assignment.id}
                      onClick={() => setFocus(focus === assignment.id ? null : assignment.id)}
                    >
                      <strong>{roleName(assignment.role)}</strong> ·{' '}
                      {principalName(assignment.principal)}
                    </button>
                    <span className="subtle">
                      {' '}
                      {assignment.scope === selected
                        ? 'assigned here'
                        : `from ${nodeName(assignment.scope)}`}
                    </span>{' '}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      aria-label={`Remove ${roleName(assignment.role)} for ${principalName(assignment.principal)}`}
                      onClick={() =>
                        setAssignments((list) => list.filter((entry) => entry.id !== assignment.id))
                      }
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {here.length === 0 && <li className="subtle">None.</li>}
              </ul>
              <div className="viz-assign">
                <select
                  className="select"
                  aria-label="Principal to assign"
                  value={newPrincipal}
                  onChange={(event) => setNewPrincipal(event.target.value)}
                >
                  {rbacModel.principals.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <select
                  className="select"
                  aria-label="Role to assign"
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value)}
                >
                  {rbacModel.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    const id = `u${Date.now()}`
                    setAssignments((list) => [
                      ...list,
                      { id, principal: newPrincipal, role: newRole, scope: selected },
                    ])
                    setFocus(id)
                  }}
                >
                  Assign here
                </button>
              </div>
              <p className="subtle" style={{ margin: 0 }}>
                {rbacModel.roles.find((role) => role.id === newRole)?.description}
              </p>
              {assignments !== rbacModel.assignments && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setAssignments(rbacModel.assignments)}
                >
                  Reset assignments
                </button>
              )}
            </div>
            <div className="card stack-sm">
              <h3 className="card__title">Deny assignments</h3>
              {denies.length === 0 ? (
                <p className="subtle" style={{ margin: 0 }}>
                  None here.
                </p>
              ) : (
                denies.map((deny) => (
                  <div key={deny.id} className="stack-sm">
                    <strong>🚫 {deny.name}</strong>
                    <span className="subtle">
                      Blocks <code>{deny.actions.join(', ')}</code> for everyone except{' '}
                      {(deny.excludePrincipals ?? []).map(principalName).join(', ') || 'nobody'}.
                      Created by: {deny.source}.
                    </span>
                  </div>
                ))
              )}
              <p className="subtle" style={{ margin: 0 }}>
                You can&rsquo;t create deny assignments yourself - deployment stacks and managed
                apps do. They win over every role, Owner included.
              </p>
            </div>
            <div className="card stack-sm">
              <h3 className="card__title">Azure Policy in effect</h3>
              <ul className="viz-list">
                {allPolicies.map((policy) => (
                  <li key={policy.id} className={inForce.has(policy.id) ? '' : 'is-muted'}>
                    <Badge tone={EFFECT_TONE[policy.effect]}>{policy.effect}</Badge>{' '}
                    <strong>{policy.name}</strong>
                    <span className="subtle">
                      {' '}
                      · from {nodeName(policy.scope)}
                      {!inForce.has(policy.id) && ' · excluded here (notScopes)'}
                    </span>
                    <br />
                    <span className="subtle">{policy.then}</span>
                  </li>
                ))}
                {allPolicies.length === 0 && <li className="subtle">None.</li>}
              </ul>
              <p className="subtle" style={{ margin: 0 }}>
                RBAC decides <em>who</em> may act; Policy decides <em>what</em> may exist - for
                everyone.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="card stack-sm" aria-labelledby="rbac-request">
        <h2 id="rbac-request" className="card__title">
          Evaluate a request
        </h2>
        <div className="viz-form">
          <label className="field">
            <span className="field__label">Who</span>
            <select
              className="select"
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
            >
              {rbacModel.principals
                .filter((entry) => entry.kind !== 'group')
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Does what</span>
            <select
              className="select"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              {rbacModel.actions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Where</span>
            <select
              className="select"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              {targets.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
          </label>
          {actionDef?.write &&
            actionDef.creates !== 'Microsoft.Resources/subscriptions/resourceGroups' && (
              <>
                <label className="field">
                  <span className="field__label">location</span>
                  <select
                    className="select"
                    value={String(props.location ?? '')}
                    onChange={(event) =>
                      setProps((current) => ({ ...current, location: event.target.value }))
                    }
                  >
                    {['westeurope', 'northeurope', 'uksouth', 'eastus'].map((location) => (
                      <option key={location}>{location}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field__label">tags.costCenter</span>
                  <input
                    className="search-input"
                    value={String(props['tags.costCenter'] ?? '')}
                    placeholder="(none)"
                    onChange={(event) =>
                      setProps((current) => ({
                        ...current,
                        'tags.costCenter': event.target.value || undefined,
                      }))
                    }
                  />
                </label>
                {actionDef.creates === 'Microsoft.Storage/storageAccounts' && (
                  <label className="row" style={{ alignSelf: 'end', minHeight: 44 }}>
                    <input
                      type="checkbox"
                      checked={props.allowBlobPublicAccess === true}
                      onChange={(event) =>
                        setProps((current) => ({
                          ...current,
                          allowBlobPublicAccess: event.target.checked,
                        }))
                      }
                    />
                    allowBlobPublicAccess
                  </label>
                )}
              </>
            )}
        </div>
        <p className="subtle" style={{ margin: 0 }}>
          <code>{actionDef?.operation}</code> ·{' '}
          {actionDef?.plane === 'data' ? 'data plane' : 'control plane'}
        </p>
        {showResult ? (
          <>
            <ol className="viz-trace" aria-label="How Azure decides">
              {result.steps.map((step) => (
                <li key={step.stage} className={step.ok ? 'is-ok' : 'is-bad'}>
                  <span className="viz-trace__stage">
                    {step.ok ? '✓' : '✗'}{' '}
                    {step.stage === 'deny'
                      ? 'Deny assignments'
                      : step.stage === 'rbac'
                        ? 'Role assignments'
                        : 'Azure Policy'}
                  </span>
                  <span>
                    <RichText text={step.text} />
                  </span>
                </li>
              ))}
            </ol>
            <p
              role="status"
              className={result.outcome === 'allowed' ? 'viz-ok' : 'viz-bad'}
              style={{ margin: 0 }}
            >
              <strong>{OUTCOMES.find((outcome) => outcome.id === result.outcome)?.label}</strong>
              {result.effects.length > 0 &&
                ` - ${result.effects.map((effect) => effect.note).join(' ')}`}
            </p>
          </>
        ) : (
          <p className="subtle">Make your prediction above to see how Azure decides.</p>
        )}
      </section>
    </div>
  )
}
