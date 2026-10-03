import { useSearchParams } from 'react-router-dom'
import { CidrTab } from './network/CidrTab'
import { NsgTab } from './network/NsgTab'
import { PeeringTab } from './network/PeeringTab'

const TABS = [
  { id: 'cidr', label: 'Subnet designer', Component: CidrTab },
  { id: 'nsg', label: 'NSG evaluator', Component: NsgTab },
  { id: 'peering', label: 'Peering and reachability', Component: PeeringTab },
] as const

/** AZ-104 networking, hands on: subnets, NSGs and peering. */
export function NetworkLabPage() {
  const [params, setParams] = useSearchParams()
  const active = TABS.find((tab) => tab.id === params.get('tab')) ?? TABS[0]
  const { Component } = active
  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>Networking lab</h1>
        <p className="page-header__meta">
          Plan VNets and subnets, watch a packet go through NSG rules, and find out what can reach
          what across peerings - with Azure&rsquo;s real rules.
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
      <Component />
    </div>
  )
}
