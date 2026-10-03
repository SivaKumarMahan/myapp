import { useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { Badge, type BadgeTone } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import {
  areaTitle,
  resolveLinks,
  roleById,
  roles,
  rolesVersion,
  skillAreas,
  skills,
  type Importance,
  type Role,
  type Skill,
} from '../content/roles'
import {
  coreGaps,
  isKnown,
  roleCoverage,
  roleItems,
  roleMatch,
  rolesNeeding,
  skillCoverage,
  topGaps,
  type RoleItem,
} from '../lib/roles'
import { useProgress } from '../lib/use-progress'

const IMPORTANCE_TONE: Record<Importance, BadgeTone> = {
  core: 'info',
  important: 'neutral',
  nice: 'neutral',
}
const IMPORTANCE_LABEL: Record<Importance, string> = {
  core: 'Core',
  important: 'Important',
  nice: 'Nice to have',
}
const HEAT: Record<Importance, string> = { core: '4', important: '2', nice: '1' }

const askBot = (text: string) => `/bot?say=${encodeURIComponent(text)}`

const TABS = [
  { to: '/roles', label: 'Roles', end: true },
  { to: '/roles/matrix', label: 'Skills matrix' },
  { to: '/roles/compare', label: 'Compare' },
  { to: '/roles/fit', label: 'My fit' },
  { to: '/roles/tools', label: 'Tool lookup' },
]

function RolesFrame({
  title,
  intro,
  children,
}: {
  title: string
  intro: ReactNode
  children: ReactNode
}) {
  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>{title}</h1>
        <p className="page-header__meta">{intro}</p>
      </header>
      <nav className="chip-row" aria-label="Roles & skills">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className="chip">
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  )
}

function SkillLinks({ skill, limit = 3 }: { skill: Skill; limit?: number }) {
  const links = resolveLinks(skill.appLinks).slice(0, limit)
  if (links.length === 0) return <Badge tone="warning">No content yet</Badge>
  return (
    <span className="role-links">
      {links.map((link) => (
        <Link key={link.ref} to={link.to}>
          {link.label}
        </Link>
      ))}
    </span>
  )
}

/* ---------- Overview ---------- */

export function RolesOverviewPage() {
  const { state } = useProgress()
  return (
    <RolesFrame
      title="Roles & skills"
      intro="Ten in-demand DevOps and cloud roles: what each one does, the skills and tools it needs, and where this app covers them. Coverage is your progress across a role's core skills."
    >
      <div className="card-grid card-grid--2 roles-grid">
        {roles.map((role) => {
          const coverage = roleCoverage(role, state)
          return (
            <Link
              key={role.id}
              to={`/roles/${role.id}`}
              className="card card--interactive stack-sm"
            >
              <div className="row">
                <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
                  {role.icon}
                </span>
                <strong className="card__title" style={{ flex: '1 1 auto' }}>
                  {role.title}
                </strong>
              </div>
              <p className="subtle" style={{ margin: 0 }}>
                {role.oneLineSummary}
              </p>
              <div className="chip-row">
                {role.toolsAtAGlance.slice(0, 6).map((tool) => (
                  <span key={tool} className="tool-chip">
                    {tool}
                  </span>
                ))}
              </div>
              <ProgressBar value={coverage} label="Core skills covered" showValue />
            </Link>
          )
        })}
      </div>
      <details className="card">
        <summary className="card__title">Core skills with no content in the app yet</summary>
        <ul className="role-list" style={{ marginTop: '0.75rem' }}>
          {coreGaps().map(({ role, skills: missing }) => (
            <li key={role.id}>
              <Link to={`/roles/${role.id}`}>
                {role.icon} {role.title}
              </Link>
              : {missing.map((skill) => skill.name).join(' · ')}
            </li>
          ))}
        </ul>
      </details>
      <p className="subtle">
        Role data {rolesVersion}. Vendor-neutral where possible, with Azure and AWS names side by
        side; no salaries or market figures, which go stale. Edit{' '}
        <code>src/content/roles/roles.json</code> to change it.
      </p>
    </RolesFrame>
  )
}

/* ---------- Detail ---------- */

export function RoleDetailPage() {
  const { roleId } = useParams()
  const role = roleById.get(roleId ?? '')
  const { state, setSkillKnown } = useProgress()
  if (!role) {
    return (
      <RolesFrame title="Role not found" intro="That role is not in the list.">
        <Link to="/roles">All roles</Link>
      </RolesFrame>
    )
  }
  const firstTopic = roleItems(role)
    .filter((item) => item.importance === 'core')
    .flatMap((item) => item.skill.appLinks)
    .find((ref) => ref.startsWith('itv:'))
  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <p className="subtle" style={{ margin: 0 }}>
          <Link to="/roles">Roles & skills</Link>
        </p>
        <h1>
          <span aria-hidden="true">{role.icon}</span> {role.title}
        </h1>
        <p className="page-header__meta">{role.oneLineSummary}</p>
        <p className="subtle" style={{ margin: 0 }}>
          Also called: {role.alsoKnownAs.join(' · ')}
        </p>
      </header>

      <div className="row">
        <Badge tone="info">Coverage {roleCoverage(role, state)}%</Badge>
        <Badge>My fit {roleMatch(role, state)}%</Badge>
        {firstTopic && (
          <Link className="btn btn--sm" to={askBot(`/mock ${firstTopic.slice(4)}`)}>
            🤖 Mock interview
          </Link>
        )}
        <Link
          className="btn btn--sm btn--secondary"
          to={`/roles/compare?roles=${[role.id, ...role.overlapsWith.slice(0, 1)].join(',')}`}
        >
          Compare
        </Link>
      </div>

      <div className="card-grid card-grid--2">
        <section className="card stack-sm">
          <h2 className="card__title">What the role focuses on</h2>
          <ul className="role-list">
            {role.focus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="card stack-sm">
          <h2 className="card__title">A day in the life</h2>
          <ul className="role-list">
            {role.dayInLife.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="stack-sm">
        <h2>Tools at a glance</h2>
        <div className="chip-row">
          {role.toolsAtAGlance.map((tool) => (
            <Link
              key={tool}
              className="tool-chip"
              to={`/roles/tools?q=${encodeURIComponent(tool.split(' /')[0])}`}
            >
              {tool}
            </Link>
          ))}
        </div>
      </section>

      <section className="stack-sm" aria-labelledby="skills">
        <h2 id="skills">Skills</h2>
        <p className="subtle" style={{ margin: 0 }}>
          Tick what you already know - it counts towards My fit for every role.
        </p>
        {[...role.skillAreas]
          .sort(
            (a, b) =>
              ['core', 'important', 'nice'].indexOf(a.importance) -
              ['core', 'important', 'nice'].indexOf(b.importance),
          )
          .map((area) => (
            <div key={area.area} className="card stack-sm">
              <div className="row">
                <h3 className="card__title" style={{ flex: '1 1 auto', margin: 0 }}>
                  {areaTitle.get(area.area)}
                </h3>
                <Badge tone={IMPORTANCE_TONE[area.importance]}>
                  {IMPORTANCE_LABEL[area.importance]}
                </Badge>
              </div>
              <ul className="role-skills">
                {area.items.map((item) => {
                  const skill = skills.find((entry) => entry.id === item.skill)
                  if (!skill) return null
                  const covered = Math.round(skillCoverage(skill, state) * 100)
                  return (
                    <li key={skill.id}>
                      <label className="role-skills__name">
                        <input
                          type="checkbox"
                          checked={isKnown(skill.id, state)}
                          onChange={(event) => setSkillKnown(skill.id, event.target.checked)}
                        />
                        <span>
                          {skill.name}{' '}
                          <span className="subtle">
                            · {skill.type} · {item.level}
                            {covered > 0 && !isKnown(skill.id, state) ? ` · ${covered}% done` : ''}
                          </span>
                        </span>
                      </label>
                      <span className="role-skills__practise">
                        <SkillLinks skill={skill} limit={2} />
                        <Link className="subtle" to={askBot(skill.search)}>
                          Ask the bot
                        </Link>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
      </section>

      <div className="card-grid card-grid--2">
        <section className="card stack-sm">
          <h2 className="card__title">What interviewers probe</h2>
          <ul className="role-list">
            {role.interviewFocus.map((item) => (
              <li key={item}>
                {item}{' '}
                <Link className="subtle" to={askBot(item)}>
                  practise →
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card stack-sm">
          <h2 className="card__title">Certifications</h2>
          <ul className="role-list">
            {role.certifications.map((cert) => {
              const link = cert.appLink ? resolveLinks([cert.appLink])[0] : undefined
              return (
                <li key={cert.name}>
                  {cert.name} <span className="subtle">· {cert.issuer}</span>{' '}
                  <Badge tone={cert.status === 'recommended' ? 'success' : 'neutral'}>
                    {cert.status}
                  </Badge>
                  {link && (
                    <>
                      {' '}
                      <Link to={link.to}>Study it here</Link>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="subtle" style={{ margin: 0 }}>
            Check the issuer&rsquo;s site before booking - exams are renamed and retired.
          </p>
        </section>
      </div>

      <section className="stack-sm" aria-labelledby="path">
        <h2 id="path">Learning path</h2>
        <ol className="stepper">
          {role.learningPath.map((step, index) => {
            const links = resolveLinks(step.appLinks)
            return (
              <li key={step.title} className="stepper__step">
                <span className="stepper__num" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="stack-sm">
                  <strong>{step.title}</strong>
                  <span className="subtle">{step.detail}</span>
                  <span className="role-links">
                    {links.length === 0 ? (
                      <Badge tone="warning">No content yet</Badge>
                    ) : (
                      links.map((link) => (
                        <Link key={link.ref} className="btn btn--sm btn--secondary" to={link.to}>
                          Practise this: {link.label}
                        </Link>
                      ))
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="stack-sm">
        <h2>Overlaps with</h2>
        <div className="chip-row">
          {role.overlapsWith.map((id) => {
            const other = roleById.get(id)
            return other ? (
              <Link key={id} className="chip" to={`/roles/${id}`}>
                {other.icon} {other.title}
              </Link>
            ) : null
          })}
        </div>
      </section>
    </div>
  )
}

/* ---------- Matrix ---------- */

export function RolesMatrixPage() {
  const [cell, setCell] = useState<{ role: string; area: string } | null>(null)
  const selectedRole = cell ? roleById.get(cell.role) : undefined
  const selectedArea = selectedRole?.skillAreas.find((area) => area.area === cell?.area)
  return (
    <RolesFrame
      title="Skills matrix"
      intro="Every role against every skill area. Darker means more important to the role. Tap a cell for the skills and tools behind it."
    >
      <div className="chip-row roles-legend" aria-label="Legend">
        {(['core', 'important', 'nice'] as Importance[]).map((importance) => (
          <span key={importance} className="row" style={{ gap: '0.35rem' }}>
            <span
              className={`roles-legend__swatch heat-cell--${HEAT[importance]}`}
              aria-hidden="true"
            />
            {IMPORTANCE_LABEL[importance]}
          </span>
        ))}
        <span className="row" style={{ gap: '0.35rem' }}>
          <span className="roles-legend__swatch heat-cell--empty" aria-hidden="true" />
          Not needed
        </span>
      </div>
      <div className="heatmap">
        <div className="heatmap__scroll">
          <table className="heatmap__table roles-matrix">
            <caption className="visually-hidden">Skill areas by role</caption>
            <thead>
              <tr>
                <th scope="col">Skill area</th>
                {roles.map((role) => (
                  <th key={role.id} scope="col" title={role.title}>
                    <Link to={`/roles/${role.id}`}>
                      <span aria-hidden="true">{role.icon}</span>{' '}
                      {role.title.split(' (')[0].split(' / ')[0]}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skillAreas.map((area) => (
                <tr key={area.id}>
                  <th scope="row">{area.title}</th>
                  {roles.map((role) => {
                    const found = role.skillAreas.find((entry) => entry.area === area.id)
                    const active = cell?.role === role.id && cell.area === area.id
                    return (
                      <td
                        key={role.id}
                        className={`heat-cell ${found ? `heat-cell--${HEAT[found.importance]}` : 'heat-cell--empty'}${active ? ' roles-matrix__active' : ''}`}
                      >
                        {found ? (
                          <button
                            type="button"
                            className="roles-matrix__cell"
                            aria-pressed={active}
                            aria-label={`${role.title}, ${area.title}: ${IMPORTANCE_LABEL[found.importance]}`}
                            onClick={() =>
                              setCell(active ? null : { role: role.id, area: area.id })
                            }
                          >
                            {found.importance === 'core'
                              ? 'Core'
                              : found.importance === 'important'
                                ? 'Imp.'
                                : 'Nice'}
                          </button>
                        ) : (
                          <span aria-label="Not needed">–</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedRole && selectedArea && (
        <section className="card stack-sm" aria-live="polite">
          <div className="row">
            <h2 className="card__title" style={{ flex: '1 1 auto', margin: 0 }}>
              {selectedRole.icon} {selectedRole.title} · {areaTitle.get(selectedArea.area)}
            </h2>
            <Badge tone={IMPORTANCE_TONE[selectedArea.importance]}>
              {IMPORTANCE_LABEL[selectedArea.importance]}
            </Badge>
          </div>
          <ul className="role-skills">
            {selectedArea.items.map((item) => {
              const skill = skills.find((entry) => entry.id === item.skill)
              return skill ? (
                <li key={skill.id}>
                  <span>
                    {skill.name} <span className="subtle">· {item.level}</span>
                  </span>
                  <SkillLinks skill={skill} limit={2} />
                </li>
              ) : null
            })}
          </ul>
        </section>
      )}
    </RolesFrame>
  )
}

/* ---------- Compare ---------- */

export function RolesComparePage() {
  const [params, setParams] = useSearchParams()
  const picked = (params.get('roles') ?? 'devops-engineer,sre')
    .split(',')
    .filter((id) => roleById.has(id))
    .slice(0, 3)
  const toggle = (id: string) => {
    const next = picked.includes(id)
      ? picked.filter((entry) => entry !== id)
      : [...picked, id].slice(-3)
    setParams({ roles: next.join(',') }, { replace: true })
  }
  const chosen = picked.map((id) => roleById.get(id) as Role)
  const itemsByRole = chosen.map(
    (role) => new Map(roleItems(role).map((item) => [item.skill.id, item])),
  )
  const shared =
    chosen.length < 2
      ? []
      : [...itemsByRole[0].keys()].filter((id) => itemsByRole.every((items) => items.has(id)))
  const sharedSet = new Set(shared)

  return (
    <RolesFrame
      title="Compare roles"
      intro="Pick two or three roles to see the skills they share and what is unique to each."
    >
      <div className="chip-row" role="group" aria-label="Roles to compare">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            className="chip"
            aria-pressed={picked.includes(role.id)}
            onClick={() => toggle(role.id)}
          >
            {role.icon} {role.title.split(' (')[0]}
          </button>
        ))}
      </div>
      {chosen.length < 2 ? (
        <p className="subtle">Pick at least two roles.</p>
      ) : (
        <>
          <section className="card stack-sm">
            <h2 className="card__title">
              Shared skills <span className="subtle">({shared.length})</span>
            </h2>
            <ul className="role-skills">
              {shared.map((id) => (
                <li key={id}>
                  <span>{itemsByRole[0].get(id)?.skill.name}</span>
                  <span className="row" style={{ gap: '0.3rem' }}>
                    {itemsByRole.map((items, index) => {
                      const item = items.get(id) as RoleItem
                      return (
                        <Badge key={chosen[index].id} tone={IMPORTANCE_TONE[item.importance]}>
                          {chosen[index].icon}{' '}
                          {item.importance === 'nice' ? 'nice' : item.importance} · {item.level}
                        </Badge>
                      )
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <div className={`card-grid card-grid--${chosen.length === 3 ? '3' : '2'}`}>
            {chosen.map((role, index) => {
              const unique = [...itemsByRole[index].values()].filter(
                (item) => !sharedSet.has(item.skill.id),
              )
              return (
                <section key={role.id} className="card stack-sm">
                  <h2 className="card__title">
                    {role.icon} Only in {role.title.split(' (')[0]}{' '}
                    <span className="subtle">({unique.length})</span>
                  </h2>
                  <ul className="role-list">
                    {unique
                      .sort(
                        (a, b) =>
                          ['core', 'important', 'nice'].indexOf(a.importance) -
                          ['core', 'important', 'nice'].indexOf(b.importance),
                      )
                      .map((item) => (
                        <li key={item.skill.id}>
                          {item.skill.name}{' '}
                          <Badge tone={IMPORTANCE_TONE[item.importance]}>
                            {IMPORTANCE_LABEL[item.importance]}
                          </Badge>
                        </li>
                      ))}
                  </ul>
                </section>
              )
            })}
          </div>
        </>
      )}
    </RolesFrame>
  )
}

/* ---------- My fit ---------- */

export function RolesFitPage() {
  const { state, setSkillKnown } = useProgress()
  const [filter, setFilter] = useState('')
  const ranked = useMemo(
    () =>
      roles
        .map((role) => ({ role, match: roleMatch(role, state) }))
        .sort((a, b) => b.match - a.match),
    [state],
  )
  const [target, setTarget] = useState<string>('')
  const targetRole = roleById.get(target) ?? ranked[0].role
  const gaps = topGaps(targetRole, state)
  const ticked = Object.keys(state.skills).filter((id) =>
    skills.some((skill) => skill.id === id),
  ).length
  const needle = filter.trim().toLowerCase()

  return (
    <RolesFrame
      title="My fit"
      intro="Tick the skills and tools you know. Your ticks stay on this device and are included in Progress & data → Export."
    >
      <div className="card-grid card-grid--2">
        <section className="card stack-sm" aria-labelledby="fit-match">
          <h2 id="fit-match" className="card__title">
            Match per role <span className="subtle">· {ticked} skills ticked</span>
          </h2>
          {ranked.map(({ role, match }) => (
            <div key={role.id} className="fit-row">
              <Link to={`/roles/${role.id}`}>
                {role.icon} {role.title.split(' (')[0]}
              </Link>
              <ProgressBar value={match} label={`${role.title} match`} showValue />
            </div>
          ))}
        </section>
        <section className="card stack-sm" aria-labelledby="fit-gaps">
          <h2 id="fit-gaps" className="card__title">
            Top 5 gaps to learn next
          </h2>
          <label className="row fit-target">
            <span className="subtle">For the role</span>
            <select value={targetRole.id} onChange={(event) => setTarget(event.target.value)}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title}
                </option>
              ))}
            </select>
          </label>
          {gaps.length === 0 ? (
            <p>You have ticked everything this role needs. 🎉</p>
          ) : (
            <ol className="role-list">
              {gaps.map((item) => (
                <li key={item.skill.id}>
                  <strong>{item.skill.name}</strong>{' '}
                  <span className="subtle">
                    · {IMPORTANCE_LABEL[item.importance].toLowerCase()} · {item.level}
                  </span>
                  <br />
                  <SkillLinks skill={item.skill} limit={2} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="stack-sm" aria-labelledby="fit-skills">
        <h2 id="fit-skills">Skills I know</h2>
        <input
          type="search"
          className="search-input"
          placeholder="Filter skills, e.g. terraform"
          aria-label="Filter skills"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        {skillAreas.map((area) => {
          const areaSkills = skills.filter(
            (skill) =>
              roles.some((role) =>
                roleItems(role).some((item) => item.skill.id === skill.id && item.area === area.id),
              ) &&
              (!needle || skill.name.toLowerCase().includes(needle)),
          )
          if (areaSkills.length === 0) return null
          return (
            <fieldset key={area.id} className="card fit-area">
              <legend className="card__title">{area.title}</legend>
              {areaSkills.map((skill) => (
                <label key={skill.id} className="fit-skill">
                  <input
                    type="checkbox"
                    checked={isKnown(skill.id, state)}
                    onChange={(event) => setSkillKnown(skill.id, event.target.checked)}
                  />
                  <span>{skill.name}</span>
                </label>
              ))}
            </fieldset>
          )
        })}
      </section>
    </RolesFrame>
  )
}

/* ---------- Tool lookup ---------- */

export function RolesToolsPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const needle = query.trim().toLowerCase()
  const matchingSkills = needle
    ? skills.filter((skill) => skill.name.toLowerCase().includes(needle))
    : []
  const listedBy = needle
    ? roles.filter((role) =>
        role.toolsAtAGlance.some((tool) => tool.toLowerCase().includes(needle)),
      )
    : []
  return (
    <RolesFrame
      title="Tool lookup"
      intro="Search a tool or skill to see which roles need it and how much."
    >
      <input
        type="search"
        className="search-input"
        placeholder="e.g. Prometheus, Terraform, KQL"
        aria-label="Search tools and skills"
        value={query}
        onChange={(event) =>
          setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })
        }
      />
      {!needle && (
        <div className="chip-row">
          {[
            'Terraform',
            'Kubernetes',
            'Prometheus',
            'KQL',
            'Helm',
            'Python',
            'Key Vault',
            'Argo CD',
          ].map((tool) => (
            <button
              key={tool}
              type="button"
              className="chip"
              onClick={() => setParams({ q: tool }, { replace: true })}
            >
              {tool}
            </button>
          ))}
        </div>
      )}
      {needle && matchingSkills.length === 0 && listedBy.length === 0 && (
        <p className="subtle">No role lists &ldquo;{query}&rdquo;.</p>
      )}
      {matchingSkills.map((skill) => {
        const needing = rolesNeeding(skill.id)
        return (
          <section key={skill.id} className="card stack-sm">
            <div className="row">
              <h2 className="card__title" style={{ flex: '1 1 auto', margin: 0 }}>
                {skill.name}
              </h2>
              <Badge>{skill.type}</Badge>
            </div>
            <ul className="role-skills">
              {needing.map(({ role, item }) => (
                <li key={role.id}>
                  <Link to={`/roles/${role.id}`}>
                    {role.icon} {role.title}
                  </Link>
                  <span className="row" style={{ gap: '0.3rem' }}>
                    <Badge tone={IMPORTANCE_TONE[item.importance]}>
                      {IMPORTANCE_LABEL[item.importance]}
                    </Badge>
                    <span className="subtle">{item.level}</span>
                  </span>
                </li>
              ))}
            </ul>
            <span className="row">
              <span className="subtle">Learn it here:</span> <SkillLinks skill={skill} />
            </span>
          </section>
        )
      })}
      {listedBy.length > 0 && (
        <section className="card stack-sm">
          <h2 className="card__title">In the &ldquo;tools at a glance&rdquo; of</h2>
          <div className="chip-row">
            {listedBy.map((role) => (
              <Link key={role.id} className="chip" to={`/roles/${role.id}`}>
                {role.icon} {role.title.split(' (')[0]}
              </Link>
            ))}
          </div>
        </section>
      )}
    </RolesFrame>
  )
}
