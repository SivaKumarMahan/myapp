/**
 * Azure authorization, modelled closely enough to reason with:
 *
 * 1. **Deny assignments** are checked first. One that covers the action at
 *    the target scope (or above) blocks it, whatever roles say.
 * 2. **Role assignments** at the target scope or any ancestor grant the
 *    role's `actions` minus `notActions` (control plane) or `dataActions`
 *    minus `notDataActions` (data plane). Grants are additive.
 * 3. **Azure Policy** is evaluated on create/update requests that RBAC has
 *    allowed. `deny` rejects the request; `audit` lets it through but marks
 *    it non-compliant; `modify`/`append` change it; `deployIfNotExists`
 *    deploys something afterwards. Policy does not care who you are - an
 *    Owner is denied exactly like anyone else.
 *
 * Role definitions in the data are trimmed to the actions this explorer
 * uses; the shapes and wildcards are Azure's.
 */

export type NodeType = 'tenant' | 'mg' | 'subscription' | 'rg' | 'resource'

export interface ScopeNode {
  id: string
  name: string
  type: NodeType
  parent?: string
  /** For resources, e.g. Microsoft.Compute/virtualMachines. */
  resourceType?: string
  location?: string
}

export interface Principal {
  id: string
  name: string
  kind: 'user' | 'group' | 'servicePrincipal' | 'managedIdentity'
  /** Groups this principal is a member of. */
  memberOf?: string[]
}

export interface RoleDefinition {
  id: string
  name: string
  description: string
  actions: string[]
  notActions?: string[]
  dataActions?: string[]
  notDataActions?: string[]
}

export interface RoleAssignment {
  id: string
  principal: string
  role: string
  scope: string
}

export interface DenyAssignment {
  id: string
  name: string
  scope: string
  /** Who created it - users cannot create deny assignments directly. */
  source: string
  actions: string[]
  dataActions?: string[]
  /** Principals the deny does not apply to. Everyone else is denied. */
  excludePrincipals?: string[]
}

export type PolicyEffect =
  'deny' | 'audit' | 'modify' | 'append' | 'deployIfNotExists' | 'auditIfNotExists' | 'disabled'

export interface PolicyCondition {
  field: string
  equals?: string | boolean
  notEquals?: string | boolean
  in?: string[]
  notIn?: string[]
  exists?: boolean
}

export interface PolicyAssignment {
  id: string
  name: string
  scope: string
  notScopes?: string[]
  effect: PolicyEffect
  /** All must hold for the policy to match ("if"). */
  conditions: PolicyCondition[]
  /** What happens, in words, when it matches. */
  then: string
  /** modify/append: the property it sets. */
  sets?: { field: string; value: string }
}

export interface ActionDef {
  id: string
  label: string
  operation: string
  plane: 'control' | 'data'
  /** Creates or updates a resource, so Azure Policy evaluates it. */
  write?: boolean
  /** Node types this action can target. */
  targets: NodeType[]
  /** Resources: only this resource type. */
  on?: string
  /** For writes: the resource type being created (Policy sees this). */
  creates?: string
}

export interface Model {
  nodes: ScopeNode[]
  principals: Principal[]
  roles: RoleDefinition[]
  assignments: RoleAssignment[]
  denyAssignments: DenyAssignment[]
  policies: PolicyAssignment[]
  actions: ActionDef[]
}

export type RequestProps = Record<string, string | boolean | undefined>

/** Azure action strings are case-insensitive; `*` matches any run of characters. */
export function actionMatches(pattern: string, operation: string): boolean {
  const regex = new RegExp(
    `^${pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\/]/g, '\\$&'))
      .join('.*')}$`,
    'i',
  )
  return regex.test(operation)
}

const anyMatch = (patterns: string[] | undefined, operation: string) =>
  (patterns ?? []).some((pattern) => actionMatches(pattern, operation))

/** Does this role permit the operation on the given plane? */
export function roleAllows(role: RoleDefinition, operation: string, plane: 'control' | 'data') {
  return plane === 'control'
    ? anyMatch(role.actions, operation) && !anyMatch(role.notActions, operation)
    : anyMatch(role.dataActions, operation) && !anyMatch(role.notDataActions, operation)
}

/** The node and its ancestors, nearest first. */
export function ancestry(nodes: ScopeNode[], id: string): ScopeNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const chain: ScopeNode[] = []
  let current = byId.get(id)
  while (current && chain.length < 20) {
    chain.push(current)
    current = current.parent ? byId.get(current.parent) : undefined
  }
  return chain
}

/** Is `scope` the node itself or one of its ancestors? */
export const appliesAt = (nodes: ScopeNode[], scope: string, target: string) =>
  ancestry(nodes, target).some((node) => node.id === scope)

/** The principal and every group it belongs to. */
export function identities(model: Model, principalId: string): string[] {
  const principal = model.principals.find((entry) => entry.id === principalId)
  return [principalId, ...(principal?.memberOf ?? [])]
}

/** Role assignments that reach the target for a principal (directly or through a group). */
export function effectiveAssignments(model: Model, principalId: string, target: string) {
  const who = identities(model, principalId)
  return model.assignments
    .filter(
      (assignment) =>
        who.includes(assignment.principal) && appliesAt(model.nodes, assignment.scope, target),
    )
    .map((assignment) => ({
      assignment,
      role: model.roles.find((role) => role.id === assignment.role),
      inherited: assignment.scope !== target,
      viaGroup: assignment.principal !== principalId ? assignment.principal : undefined,
    }))
}

export function fieldValue(field: string, props: RequestProps): string | boolean | undefined {
  return props[field]
}

export function conditionHolds(condition: PolicyCondition, props: RequestProps): boolean {
  const value = fieldValue(condition.field, props)
  if (condition.exists !== undefined)
    return condition.exists === (value !== undefined && value !== '')
  if (condition.equals !== undefined)
    return String(value).toLowerCase() === String(condition.equals).toLowerCase()
  if (condition.notEquals !== undefined)
    return String(value).toLowerCase() !== String(condition.notEquals).toLowerCase()
  if (condition.in)
    return condition.in.some((entry) => entry.toLowerCase() === String(value).toLowerCase())
  if (condition.notIn)
    return !condition.notIn.some((entry) => entry.toLowerCase() === String(value).toLowerCase())
  return true
}

/** Policy assignments in force at a node: assigned at it or above, and not excluded. */
export function policiesAt(model: Model, target: string): PolicyAssignment[] {
  return model.policies.filter(
    (policy) =>
      appliesAt(model.nodes, policy.scope, target) &&
      !(policy.notScopes ?? []).some((excluded) => appliesAt(model.nodes, excluded, target)),
  )
}

export type Outcome = 'allowed' | 'denied-rbac' | 'denied-deny' | 'denied-policy'

export interface TraceStep {
  stage: 'deny' | 'rbac' | 'policy'
  ok: boolean
  text: string
}

export interface Evaluation {
  outcome: Outcome
  steps: TraceStep[]
  /** Policies that matched but did not block: audit, modify, ... */
  effects: { policy: PolicyAssignment; note: string }[]
}

/**
 * Evaluates one request the way Azure would, and explains each stage.
 * `target` is the scope the request is made at: the resource, or the
 * resource group a new resource is created in.
 */
export function evaluate(
  model: Model,
  principalId: string,
  actionId: string,
  target: string,
  props: RequestProps = {},
): Evaluation {
  const action = model.actions.find((entry) => entry.id === actionId)
  const steps: TraceStep[] = []
  const effects: Evaluation['effects'] = []
  if (!action)
    return {
      outcome: 'denied-rbac',
      steps: [{ stage: 'rbac', ok: false, text: 'Unknown action.' }],
      effects,
    }
  const who = identities(model, principalId)
  const op = action.operation

  // 1. Deny assignments
  const denies = model.denyAssignments.filter(
    (deny) =>
      appliesAt(model.nodes, deny.scope, target) &&
      !(deny.excludePrincipals ?? []).some((excluded) => who.includes(excluded)) &&
      anyMatch(action.plane === 'control' ? deny.actions : deny.dataActions, op),
  )
  if (denies.length > 0) {
    steps.push({
      stage: 'deny',
      ok: false,
      text: `Deny assignment **${denies[0].name}** (${denies[0].source}) blocks \`${op}\`. Deny assignments win over any role.`,
    })
    return { outcome: 'denied-deny', steps, effects }
  }
  steps.push({ stage: 'deny', ok: true, text: 'No deny assignment covers this action here.' })

  // 2. Role assignments
  const granting = effectiveAssignments(model, principalId, target).filter(
    (entry) => entry.role && roleAllows(entry.role, op, action.plane),
  )
  if (granting.length === 0) {
    const held = effectiveAssignments(model, principalId, target)
    steps.push({
      stage: 'rbac',
      ok: false,
      text:
        held.length === 0
          ? `No role assignment reaches this scope, so \`${op}\` is not allowed (403 AuthorizationFailed).`
          : `Roles held here (${[...new Set(held.map((entry) => entry.role?.name))].join(', ')}) do not include \`${op}\`${action.plane === 'data' ? ' - it is a **data action**, which control-plane roles like Owner and Contributor do not grant' : ''}.`,
    })
    return { outcome: 'denied-rbac', steps, effects }
  }
  const first = granting[0]
  const scopeName =
    model.nodes.find((node) => node.id === first.assignment.scope)?.name ?? first.assignment.scope
  steps.push({
    stage: 'rbac',
    ok: true,
    text: `**${first.role?.name}** ${first.inherited ? `inherited from **${scopeName}**` : 'assigned at this scope'}${first.viaGroup ? ` through group **${model.principals.find((entry) => entry.id === first.viaGroup)?.name}**` : ''} allows \`${op}\`.`,
  })

  // 3. Azure Policy - only on create/update requests
  if (!action.write) {
    steps.push({
      stage: 'policy',
      ok: true,
      text: 'Not a create or update, so Azure Policy does not evaluate it.',
    })
    return { outcome: 'allowed', steps, effects }
  }
  const request: RequestProps = { type: action.creates, ...props }
  const applicable = policiesAt(model, target).filter(
    (policy) =>
      policy.effect !== 'disabled' &&
      policy.conditions.every((condition) => conditionHolds(condition, request)),
  )
  const blocking = applicable.find((policy) => policy.effect === 'deny')
  if (blocking) {
    steps.push({
      stage: 'policy',
      ok: false,
      text: `Policy **${blocking.name}** (deny) matches: ${blocking.then} The request fails with RequestDisallowedByPolicy - even for an Owner.`,
    })
    return { outcome: 'denied-policy', steps, effects }
  }
  for (const policy of applicable) effects.push({ policy, note: policy.then })
  steps.push({
    stage: 'policy',
    ok: true,
    text:
      applicable.length === 0
        ? 'No policy in force here matches this request.'
        : `Allowed, with policy effects: ${applicable.map((policy) => `**${policy.name}** (${policy.effect})`).join(', ')}.`,
  })
  return { outcome: 'allowed', steps, effects }
}
