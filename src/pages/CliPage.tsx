import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { courseIndexes } from '../content/registry'
import { missions, missionKey, type Mission } from '../content/azcli'
import { buildCatalog } from '../lib/azcli/catalog'
import { evaluateMission } from '../lib/azcli/missions'
import { completePowerShell, runPowerShell } from '../lib/azcli/powershell'
import {
  answer,
  complete,
  createSession,
  run,
  type OutputLine,
  type ShellResult,
} from '../lib/azcli/shell'
import { emptyCloud, loadCloud, saveCloud, type CloudState } from '../lib/azcli/state'
import { readJson, writeJson } from '../lib/local-json'
import { useProgress } from '../lib/use-progress'
import { Badge } from '../components/ui/Badge'
import { RichText } from '../components/ui/RichText'

type Mode = 'bash' | 'pwsh'
interface ScrollLine extends OutputLine {
  id: number
  prompt?: string
}

const MODE_KEY = 'azure-learning-hub.azcli-mode'
const ATTEMPTS_KEY = 'azure-learning-hub.azcli-attempts'
const MISSION_KEY = 'azure-learning-hub.azcli-mission'
const MAX_LINES = 600

const PROMPTS: Record<Mode, string> = { bash: 'learner@Azure:~$', pwsh: 'PS /home/learner>' }

const WELCOME: Record<Mode, string> = {
  bash: 'Azure CLI simulator - Bash. Nothing here touches a real subscription.\nType help to get started, or try: az group create --name rg-learn --location uksouth',
  pwsh: 'Azure PowerShell simulator - Az module. Nothing here touches a real subscription.\nType Get-Command for the cmdlets, or try: New-AzResourceGroup -Name rg-learn -Location uksouth',
}

let nextLineId = 1
const lines = (result: OutputLine[]): ScrollLine[] =>
  result.map((line) => ({ ...line, id: nextLineId++ }))

/**
 * A practice terminal for the Azure CLI (and Az PowerShell), on a simulated
 * subscription kept in this browser. Missions check what you built.
 */
export function CliPage() {
  const { state: progress, recordChallengeCheck } = useProgress()
  const catalog = useMemo(() => buildCatalog(courseIndexes.map((entry) => entry.course)), [])
  const session = useRef(createSession(catalog, loadCloud()))
  const [cloud, setCloud] = useState<CloudState>(() => session.current.state)
  const [mode, setMode] = useState<Mode>(() => readJson<Mode>(MODE_KEY, 'bash'))
  const [scroll, setScroll] = useState<ScrollLine[]>(() =>
    lines([{ kind: 'info', text: WELCOME[readJson<Mode>(MODE_KEY, 'bash')] }]),
  )
  const [input, setInput] = useState('')
  const [prompt, setPrompt] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<Mode, string[]>>({ bash: [], pwsh: [] })
  const [cursor, setCursor] = useState<number | null>(null)
  const [attempts, setAttempts] = useState<string[]>(() => readJson<string[]>(ATTEMPTS_KEY, []))
  const [missionId, setMissionId] = useState<string | null>(() =>
    readJson<string | null>(MISSION_KEY, null),
  )
  const inputRef = useRef<HTMLInputElement | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  const mission = missions.find((candidate) => candidate.id === missionId) ?? null
  const checks = mission ? evaluateMission(mission, cloud, attempts) : []
  const complete_ = checks.length > 0 && checks.every((check) => check.passed)

  useEffect(() => writeJson(MODE_KEY, mode), [mode])
  useEffect(() => writeJson(MISSION_KEY, missionId), [missionId])
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [scroll])

  // Record a mission the first time it is completed.
  useEffect(() => {
    if (mission && complete_ && !progress.challenges[missionKey(mission.id)]?.solvedAt) {
      recordChallengeCheck(missionKey(mission.id), true)
    }
  }, [mission, complete_, progress.challenges, recordChallengeCheck])

  const commit = (result: ShellResult, echo: ScrollLine[]) => {
    if (result.clear) setScroll([])
    else setScroll((current) => [...current, ...echo, ...lines(result.lines)].slice(-MAX_LINES))
    setPrompt(result.prompt ?? null)
    // Cloud objects are mutated in place; a new reference re-renders the panels.
    const next = { ...session.current.state }
    session.current.state = next
    saveCloud(next)
    setCloud(next)
  }

  const submit = () => {
    const line = input
    setInput('')
    setCursor(null)
    const shownPrompt = prompt ?? PROMPTS[mode]
    const echo = lines([{ kind: 'out', text: line }]).map((entry) => ({
      ...entry,
      prompt: shownPrompt,
    }))
    if (prompt) {
      commit(answer(session.current, line), echo)
      return
    }
    if (!line.trim()) {
      setScroll((current) => [...current, ...echo])
      return
    }
    setHistory((current) => ({
      ...current,
      [mode]: [...current[mode].filter((entry) => entry !== line), line].slice(-100),
    }))
    setAttempts((current) => {
      const updated = [...current, line.trim()].slice(-200)
      writeJson(ATTEMPTS_KEY, updated)
      return updated
    })
    if (line.trim() === 'reset') {
      resetCloud()
      setScroll((current) => [
        ...current,
        ...echo,
        ...lines([{ kind: 'info', text: 'The simulated cloud is empty again.' }]),
      ])
      return
    }
    commit(
      mode === 'pwsh' ? runPowerShell(line, session.current) : run(line, session.current),
      echo,
    )
  }

  const resetCloud = (start: CloudState = emptyCloud()) => {
    session.current = createSession(catalog, start)
    saveCloud(start)
    setCloud(start)
    setPrompt(null)
    setAttempts([])
    writeJson(ATTEMPTS_KEY, [])
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      tab()
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      walk(event.key === 'ArrowUp' ? -1 : 1)
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault()
      setScroll([])
    } else if (event.key === 'c' && event.ctrlKey && !window.getSelection()?.toString()) {
      event.preventDefault()
      session.current.pending = null
      setPrompt(null)
      setScroll((current) => [
        ...current,
        ...lines([{ kind: 'out', text: `${input}^C` }]).map((entry) => ({
          ...entry,
          prompt: prompt ?? PROMPTS[mode],
        })),
      ])
      setInput('')
    }
  }

  const tab = () => {
    const result = mode === 'pwsh' ? completePowerShell(input) : complete(input, session.current)
    setInput(result.line)
    if (result.candidates.length > 0) {
      setScroll((current) => [
        ...current,
        ...lines([{ kind: 'out', text: `${PROMPTS[mode]} ${input}` }]),
        ...lines([{ kind: 'info', text: result.candidates.join('    ') }]),
      ])
    }
    inputRef.current?.focus()
  }

  const walk = (step: number) => {
    const past = history[mode]
    if (past.length === 0) return
    const position = cursor === null ? (step < 0 ? past.length - 1 : null) : cursor + step
    if (position === null || position >= past.length) {
      setCursor(null)
      setInput('')
    } else {
      const clamped = Math.max(0, position)
      setCursor(clamped)
      setInput(past[clamped])
    }
    inputRef.current?.focus()
  }

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    session.current.pending = null
    setPrompt(null)
    setScroll((current) => [...current, ...lines([{ kind: 'info', text: WELCOME[next] }])])
    inputRef.current?.focus()
  }

  const startMission = (target: Mission) => {
    const fresh = emptyCloud()
    const setupSession = createSession(catalog, fresh)
    for (const line of target.setup) run(line, setupSession)
    fresh.history = []
    resetCloud(fresh)
    setMissionId(target.id)
    setScroll(
      lines([
        {
          kind: 'info',
          text: `Mission: ${target.title}\nThe simulated cloud was reset${target.setup.length ? ' and prepared for this mission' : ''}. ${mode === 'pwsh' && target.id !== 'powershell-basics' ? 'Tip: this mission is written for Azure CLI mode.' : ''}`.trim(),
        },
      ]),
    )
    inputRef.current?.focus()
  }

  const solvedCount = missions.filter(
    (candidate) => progress.challenges[missionKey(candidate.id)]?.solvedAt,
  ).length

  return (
    <div className="page page--wide stack">
      <header className="page-header">
        <h1>Azure CLI simulator</h1>
        <p className="page-header__meta">
          A practice terminal on a simulated subscription. Your resources are kept in this browser;
          nothing touches real Azure.
        </p>
      </header>

      <div className="cli-toolbar">
        <div className="chip-row" role="group" aria-label="Shell">
          <button
            type="button"
            className="chip"
            aria-pressed={mode === 'bash'}
            onClick={() => switchMode('bash')}
          >
            Azure CLI (Bash)
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={mode === 'pwsh'}
            onClick={() => switchMode('pwsh')}
          >
            PowerShell (Az)
          </button>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            resetCloud()
            setScroll((current) => [
              ...current,
              ...lines([{ kind: 'info', text: 'The simulated cloud is empty again.' }]),
            ])
          }}
        >
          Reset the simulated cloud
        </button>
      </div>

      <div className="cli-layout">
        <section className="cli-terminal" aria-label="Terminal">
          <div
            className="cli-terminal__log"
            ref={logRef}
            role="log"
            aria-live="polite"
            onClick={() => inputRef.current?.focus()}
          >
            {scroll.map((line) => (
              <div
                key={line.id}
                className={`cli-line cli-line--${line.kind}${line.prompt ? ' cli-line--echo' : ''}`}
              >
                {line.prompt && <span className="cli-prompt">{line.prompt} </span>}
                {line.text}
              </div>
            ))}
            <div className="cli-input-row">
              <label className="cli-prompt" htmlFor="cli-input">
                {prompt ?? PROMPTS[mode]}
              </label>
              <input
                id="cli-input"
                ref={inputRef}
                className="cli-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label="Command"
              />
            </div>
          </div>
          <div className="cli-keys" aria-label="Terminal keys">
            <button type="button" className="btn btn--secondary btn--sm" onClick={tab}>
              Tab
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => walk(-1)}
              aria-label="Previous command"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => walk(1)}
              aria-label="Next command"
            >
              ↓
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setScroll([])}>
              Clear
            </button>
            <button type="button" className="btn btn--sm" onClick={submit}>
              Run ⏎
            </button>
          </div>
        </section>

        <aside className="cli-side stack" aria-label="Simulated resources and missions">
          <section className="card stack-sm" aria-labelledby="missions-heading">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id="missions-heading" className="card__title" style={{ margin: 0 }}>
                Missions
              </h2>
              <Badge tone={solvedCount === missions.length ? 'success' : 'neutral'}>
                {solvedCount}/{missions.length} done
              </Badge>
            </div>
            {mission ? (
              <MissionPanel
                mission={mission}
                checks={checks}
                done={complete_}
                onLeave={() => setMissionId(null)}
                onRestart={() => startMission(mission)}
              />
            ) : (
              <ul className="cli-missions">
                {missions.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      className="cli-mission"
                      onClick={() => startMission(candidate)}
                    >
                      <span aria-hidden="true">
                        {progress.challenges[missionKey(candidate.id)]?.solvedAt ? '✓' : '○'}
                      </span>
                      <span className="cli-mission__title">{candidate.title}</span>
                      <Badge>{candidate.exam}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!mission && (
              <p className="subtle" style={{ margin: 0, fontSize: '0.8125rem' }}>
                Starting a mission resets the simulated cloud.
              </p>
            )}
          </section>

          <ResourceTree cloud={cloud} />
        </aside>
      </div>
    </div>
  )
}

function MissionPanel({
  mission,
  checks,
  done,
  onLeave,
  onRestart,
}: {
  mission: Mission
  checks: { description: string; passed: boolean }[]
  done: boolean
  onLeave: () => void
  onRestart: () => void
}) {
  const [hints, setHints] = useState(0)
  return (
    <div className="stack-sm">
      <h3 style={{ margin: 0, fontSize: '1rem' }}>{mission.title}</h3>
      <p style={{ margin: 0 }}>
        <RichText text={mission.goal} />
      </p>
      <ol className="cli-steps">
        {mission.steps.map((step) => (
          <li key={step}>
            <RichText text={step} />
          </li>
        ))}
      </ol>
      <ul className="cli-checks" aria-label="Checks">
        {checks.map((check) => (
          <li
            key={check.description}
            className={check.passed ? 'cli-check--pass' : 'cli-check--todo'}
          >
            <span aria-hidden="true">{check.passed ? '✓' : '○'}</span> {check.description}
            <span className="visually-hidden">{check.passed ? ' (done)' : ' (not yet)'}</span>
          </li>
        ))}
      </ul>
      {done && (
        <div className="notice notice--success" role="status">
          <span className="notice__icon" aria-hidden="true">
            🎉
          </span>
          <p style={{ margin: 0 }}>
            <strong>Mission complete.</strong>
          </p>
        </div>
      )}
      {hints > 0 && (
        <ul className="sql-hints">
          {mission.hints.slice(0, hints).map((hint) => (
            <li key={hint}>
              <RichText text={hint} />
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        {hints < mission.hints.length && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setHints((count) => count + 1)}
          >
            💡 Hint
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRestart}>
          Restart
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onLeave}>
          All missions
        </button>
      </div>
    </div>
  )
}

function ResourceTree({ cloud }: { cloud: CloudState }) {
  const total =
    cloud.vnets.length + cloud.nsgs.length + cloud.vms.length + cloud.storageAccounts.length
  return (
    <section className="card stack-sm" aria-labelledby="resources-heading">
      <h2 id="resources-heading" className="card__title" style={{ margin: 0 }}>
        Your simulated resources
      </h2>
      {cloud.resourceGroups.length === 0 ? (
        <p className="subtle" style={{ margin: 0 }}>
          Nothing yet. Create a resource group to begin.
        </p>
      ) : (
        <ul className="cli-tree">
          {cloud.resourceGroups.map((rg) => {
            const mine = <T extends { resourceGroup: string }>(items: T[]) =>
              items.filter((item) => item.resourceGroup === rg.name)
            const locks = mine(cloud.locks)
            return (
              <li key={rg.name}>
                <span className="cli-tree__group">
                  📁 {rg.name} <span className="subtle">{rg.location}</span>
                  {locks.map((lock) => (
                    <Badge key={lock.name} tone="warning">
                      🔒 {lock.level}
                    </Badge>
                  ))}
                </span>
                <ul>
                  {mine(cloud.vnets).map((vnet) => (
                    <li key={vnet.name}>
                      🌐 {vnet.name}{' '}
                      <span className="subtle">{vnet.addressPrefixes.join(', ')}</span>
                      {vnet.subnets.length > 0 && (
                        <ul>
                          {vnet.subnets.map((subnet) => (
                            <li key={subnet.name}>
                              ▫ {subnet.name}{' '}
                              <span className="subtle">
                                {subnet.addressPrefix}
                                {subnet.nsg ? ` · NSG ${subnet.nsg}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                  {mine(cloud.nsgs).map((nsg) => (
                    <li key={nsg.name}>
                      🛡 {nsg.name}{' '}
                      <span className="subtle">
                        {nsg.rules.length} {nsg.rules.length === 1 ? 'rule' : 'rules'}
                      </span>
                    </li>
                  ))}
                  {mine(cloud.vms).map((vm) => (
                    <li key={vm.name}>
                      🖥 {vm.name} <span className="subtle">{vm.size}</span>{' '}
                      <Badge tone={vm.powerState === 'VM running' ? 'success' : 'neutral'}>
                        {vm.powerState.replace('VM ', '')}
                      </Badge>
                    </li>
                  ))}
                  {mine(cloud.storageAccounts).map((account) => (
                    <li key={account.name}>
                      🗄 {account.name} <span className="subtle">{account.sku}</span>
                      {(account.allowBlobPublicAccess ||
                        account.minimumTlsVersion !== 'TLS1_2') && (
                        <Badge tone="danger">⚠ insecure</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
      {total > 0 && (
        <p className="subtle" style={{ margin: 0, fontSize: '0.8125rem' }}>
          {total} resources in {cloud.resourceGroups.length} groups.
        </p>
      )}
    </section>
  )
}
