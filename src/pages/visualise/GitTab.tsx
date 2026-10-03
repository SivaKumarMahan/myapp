import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { RichText } from '../../components/ui/RichText'
import { gitComparison, gitExercises, vizKey, type GitExercise } from '../../content/visualise'
import {
  checkPasses,
  describeCheck,
  headCommit,
  initRepo,
  layout,
  run,
  runAll,
  type Repo,
} from '../../lib/visualise/git'
import { useProgress } from '../../lib/use-progress'

const DX = 58
const DY = 64
const PAD_X = 34
const PAD_Y = 34
const LABEL_W = 0

const TRACKS = [
  { id: 'basics', label: 'Basics' },
  { id: 'gitflow', label: 'GitFlow (AZ-400)' },
  { id: 'trunk', label: 'Trunk-based (AZ-400)' },
] as const

const QUICK = [
  'git commit',
  'git switch -c ',
  'git checkout ',
  'git merge ',
  'git rebase ',
  'git cherry-pick ',
  'git reset --hard ',
  'git revert ',
  'git tag ',
]

/** The commit graph: one lane per branch, time left to right. */
function Graph({ repo }: { repo: Repo }) {
  const { nodes, lanes } = layout(repo)
  const scroller = useRef<HTMLDivElement>(null)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const width = PAD_X * 2 + LABEL_W + Math.max(0, nodes.length - 1) * DX + 90
  const height = PAD_Y * 2 + Math.max(0, lanes.length - 1) * DY + 20
  const pos = (id: string) => {
    const node = byId.get(id)
    return node ? { x: PAD_X + LABEL_W + node.x * DX, y: PAD_Y + node.y * DY } : { x: 0, y: 0 }
  }
  const head = headCommit(repo)

  useEffect(() => {
    const element = scroller.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [nodes.length])

  // Labels per commit: branches (HEAD's first), then tags.
  const labels = new Map<string, { text: string; kind: 'branch' | 'head' | 'tag' }[]>()
  for (const [name, id] of Object.entries(repo.branches)) {
    const list = labels.get(id) ?? []
    list.push({
      text: name === repo.head.branch ? `HEAD → ${name}` : name,
      kind: name === repo.head.branch ? 'head' : 'branch',
    })
    labels.set(id, list)
  }
  if (!repo.head.branch)
    labels.set(head, [{ text: 'HEAD (detached)', kind: 'head' }, ...(labels.get(head) ?? [])])
  for (const [name, id] of Object.entries(repo.tags))
    labels.set(id, [...(labels.get(id) ?? []), { text: `🏷 ${name}`, kind: 'tag' }])

  return (
    <div
      className="git-graph"
      ref={scroller}
      tabIndex={0}
      role="region"
      aria-label="Commit graph (scrolls sideways)"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Commit graph: ${nodes.filter((node) => node.reachable).length} commits; ${Object.entries(
          repo.branches,
        )
          .map(([name, id]) => `${name} at ${id}`)
          .join(', ')}; HEAD at ${head}.`}
      >
        {lanes.map((lane, index) => (
          <text key={lane} x={4} y={PAD_Y + index * DY - 22} className="git-lane">
            {lane}
          </text>
        ))}
        {nodes.flatMap((node) =>
          repo.commits[node.id].parents.map((parent) => {
            const from = pos(parent)
            const to = pos(node.id)
            const bend = (to.x - from.x) / 2
            return (
              <path
                key={`${parent}-${node.id}`}
                d={
                  from.y === to.y
                    ? `M${from.x},${from.y} L${to.x},${to.y}`
                    : `M${from.x},${from.y} C${from.x + bend},${from.y} ${to.x - bend},${to.y} ${to.x},${to.y}`
                }
                className={`git-edge${node.reachable ? '' : ' is-gone'}`}
              />
            )
          }),
        )}
        {nodes.map((node) => {
          const { x, y } = pos(node.id)
          const tags = labels.get(node.id) ?? []
          return (
            <g
              key={node.id}
              className={`git-commit${node.reachable ? '' : ' is-gone'}${node.id === head ? ' is-head' : ''}`}
            >
              <title>{`${node.id}: ${node.message}${node.reachable ? '' : ' (unreachable)'}`}</title>
              <circle cx={x} cy={y} r={15} />
              <text x={x} y={y + 4} textAnchor="middle" className="git-commit__id">
                {node.id}
              </text>
              {tags.map((tag, index) => (
                <text
                  key={tag.text}
                  x={x}
                  y={y + 30 + index * 13}
                  textAnchor="middle"
                  className={`git-label git-label--${tag.kind}`}
                >
                  {tag.text}
                </text>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * Git branching simulator: type commands, watch the commit graph change,
 * and practise GitFlow and trunk-based workflows.
 */
export function GitTab() {
  const { state, recordChallengeCheck } = useProgress()
  const [exerciseId, setExerciseId] = useState('')
  const exercise = gitExercises.find((entry) => entry.id === exerciseId)
  const start = (entry?: GitExercise) => runAll(initRepo(), entry?.setup ?? []).repo
  const [history, setHistory] = useState<Repo[]>(() => [start()])
  const repo = history[history.length - 1]
  const [log, setLog] = useState<{ line: string; output: string; ok: boolean }[]>([])
  const [input, setInput] = useState('')
  const [typed, setTyped] = useState<string[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [showSolution, setShowSolution] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = (id: string) => {
    const entry = gitExercises.find((item) => item.id === id)
    setExerciseId(id)
    setHistory([start(entry)])
    setLog(
      entry
        ? [{ line: '(setup)', output: entry.setup.join('\n') || 'A fresh repository.', ok: true }]
        : [],
    )
    setShowSolution(false)
  }

  const checks = useMemo(
    () =>
      exercise
        ? exercise.checks.map((check) => ({
            description: describeCheck(check),
            passed: checkPasses(repo, check),
          }))
        : [],
    [exercise, repo],
  )
  const solved = exercise !== undefined && checks.every((check) => check.passed)
  useEffect(() => {
    if (!solved || !exercise) return
    const key = vizKey('git', exercise.id)
    if (!state.challenges[key]?.solvedAt) recordChallengeCheck(key, true)
  }, [solved, exercise, state.challenges, recordChallengeCheck])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const line = input.trim()
    if (!line) return
    const result = run(repo, line)
    setLog((current) => [...current.slice(-40), { line, output: result.output, ok: result.ok }])
    if (result.ok && result.repo !== repo)
      setHistory((current) => [...current.slice(-50), result.repo])
    setTyped((current) => [...current, line])
    setCursor(null)
    setInput('')
  }

  return (
    <div className="stack">
      <section className="card stack-sm" aria-labelledby="git-ex">
        <h2 id="git-ex" className="card__title">
          Exercise
        </h2>
        <label className="field">
          <span className="field__label">Pick one, or play freely</span>
          <select
            className="select"
            value={exerciseId}
            onChange={(event) => load(event.target.value)}
          >
            <option value="">Free play</option>
            {TRACKS.map((track) => (
              <optgroup key={track.id} label={track.label}>
                {gitExercises
                  .filter((entry) => entry.track === track.id)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {state.challenges[vizKey('git', entry.id)]?.solvedAt ? '✓ ' : ''}
                      {entry.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        {exercise && (
          <>
            <p style={{ margin: 0 }}>
              <RichText text={exercise.goal} />
            </p>
            <ul className="cli-checks" aria-label="Goal">
              {checks.map((check) => (
                <li
                  key={check.description}
                  className={check.passed ? 'cli-check--pass' : 'cli-check--todo'}
                >
                  <span aria-hidden="true">{check.passed ? '✓' : '○'}</span>{' '}
                  <RichText text={check.description} />
                </li>
              ))}
            </ul>
            {solved && (
              <p role="status" className="viz-ok" style={{ margin: 0 }}>
                ✓ Solved!
              </p>
            )}
            <details
              onToggle={(event) => setShowSolution((event.target as HTMLDetailsElement).open)}
            >
              <summary className="subtle">Hint and solution</summary>
              <p>{exercise.hint}</p>
              {showSolution && <pre className="git-solution">{exercise.solution.join('\n')}</pre>}
            </details>
          </>
        )}
      </section>

      <section className="card stack-sm" aria-labelledby="git-graph">
        <div className="row">
          <h2 id="git-graph" className="card__title" style={{ flex: '1 1 auto' }}>
            Commit graph
          </h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={history.length < 2}
            onClick={() => setHistory((current) => current.slice(0, -1))}
          >
            ↶ Undo
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => load(exerciseId)}>
            Reset
          </button>
        </div>
        <Graph repo={repo} />
        <p className="subtle" style={{ margin: 0 }}>
          Faded commits are unreachable - what rebase and reset leave behind (git keeps them in the
          reflog for a while).
        </p>
        <div className="git-terminal" aria-live="polite">
          {log.slice(-8).map((entry, index) => (
            <div key={index} className={entry.ok ? '' : 'is-error'}>
              <div className="git-terminal__cmd">$ {entry.line}</div>
              <pre>{entry.output}</pre>
            </div>
          ))}
        </div>
        <form className="git-input" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="git-cmd">
            Git command
          </label>
          <input
            id="git-cmd"
            ref={inputRef}
            className="search-input"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder='git commit -m "message"'
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp' && typed.length) {
                event.preventDefault()
                const index = cursor === null ? typed.length - 1 : Math.max(0, cursor - 1)
                setCursor(index)
                setInput(typed[index])
              } else if (event.key === 'ArrowDown' && cursor !== null) {
                event.preventDefault()
                const index = cursor + 1
                setCursor(index >= typed.length ? null : index)
                setInput(index >= typed.length ? '' : typed[index])
              }
            }}
          />
          <button type="submit" className="btn">
            Run
          </button>
        </form>
        <div className="chip-row" aria-label="Command shortcuts">
          {QUICK.map((command) => (
            <button
              key={command}
              type="button"
              className="chip"
              onClick={() => {
                setInput(command)
                inputRef.current?.focus()
              }}
            >
              {command.replace('git ', '').trim()}
            </button>
          ))}
        </div>
      </section>

      <section className="card stack-sm" aria-labelledby="git-compare">
        <h2 id="git-compare" className="card__title">
          GitFlow vs trunk-based development
        </h2>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="GitFlow and trunk-based comparison"
        >
          <table className="viz-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Aspect</span>
                </th>
                <th scope="col">GitFlow</th>
                <th scope="col">Trunk-based</th>
              </tr>
            </thead>
            <tbody>
              {gitComparison.map((row) => (
                <tr key={row.aspect}>
                  <th scope="row">{row.aspect}</th>
                  <td>{row.gitflow}</td>
                  <td>{row.trunk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
