import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'

/*
 * Each tool is its own lazily loaded chunk: opening the RBAC explorer does not
 * download the Git simulator, and none of them load until Visualise is opened.
 */
const RbacTab = lazy(() => import('./visualise/RbacTab').then((m) => ({ default: m.RbacTab })))
const DeployTab = lazy(() =>
  import('./visualise/DeployTab').then((m) => ({ default: m.DeployTab })),
)
const GitTab = lazy(() => import('./visualise/GitTab').then((m) => ({ default: m.GitTab })))
const SlaTab = lazy(() => import('./visualise/SlaTab').then((m) => ({ default: m.SlaTab })))

const TABS = [
  { id: 'rbac', label: 'RBAC & Policy', Component: RbacTab },
  { id: 'deploy', label: 'Deployment strategies', Component: DeployTab },
  { id: 'git', label: 'Git branching', Component: GitTab },
  { id: 'sla', label: 'Composite SLA', Component: SlaTab },
] as const

/** Concept visualisations: see how Azure and DevOps ideas behave, not just read about them. */
export function VisualisePage() {
  const [params, setParams] = useSearchParams()
  const active = TABS.find((tab) => tab.id === params.get('tab')) ?? TABS[0]
  const { Component } = active
  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>Visualise</h1>
        <p className="page-header__meta">
          Interactive models of ideas that are hard to picture: who can do what where in Azure, how
          releases move traffic, what Git commands do to history, and what an architecture's SLA
          really is.
        </p>
      </header>
      <div className="chip-row" role="tablist" aria-label="Tool">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="chip"
            aria-selected={tab === active}
            onClick={() => setParams({ tab: tab.id }, { replace: true })}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Suspense fallback={<p className="subtle">Loading…</p>}>
        <Component />
      </Suspense>
    </div>
  )
}
