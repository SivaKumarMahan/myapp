/**
 * A small Git model for the branching simulator: commits, branches, tags and
 * HEAD, driven by the commands people type. No files - so `reset --soft`,
 * `--mixed` and `--hard` move the branch identically, and the output says so.
 *
 * Commit ids are short and readable (C0, C1, ...); a commit copied by rebase
 * or cherry-pick gets a prime (C3'). Commits no branch, tag or HEAD can reach
 * stay in the model so the graph can show them fading out, as the reflog would.
 */

export interface Commit {
  id: string
  parents: string[]
  message: string
  /** Order of creation, for layout. */
  seq: number
  /** The branch it was made on, for the lane in the graph. */
  lane: string
  /** For copies made by rebase / cherry-pick / revert. */
  copiedFrom?: string
}

export interface Repo {
  commits: Record<string, Commit>
  branches: Record<string, string>
  tags: Record<string, string>
  /** A branch name, or a commit id when detached. */
  head: { branch?: string; commit?: string }
  /** Branch names in the order they were created, for lanes. */
  laneOrder: string[]
  seq: number
}

export interface Result {
  repo: Repo
  output: string
  ok: boolean
}

export function initRepo(): Repo {
  return {
    commits: { C0: { id: 'C0', parents: [], message: 'Initial commit', seq: 0, lane: 'main' } },
    branches: { main: 'C0' },
    tags: {},
    head: { branch: 'main' },
    laneOrder: ['main'],
    seq: 1,
  }
}

const clone = (repo: Repo): Repo => ({
  commits: { ...repo.commits },
  branches: { ...repo.branches },
  tags: { ...repo.tags },
  head: { ...repo.head },
  laneOrder: [...repo.laneOrder],
  seq: repo.seq,
})

export const headCommit = (repo: Repo): string =>
  repo.head.branch ? repo.branches[repo.head.branch] : (repo.head.commit as string)

/** Every commit reachable from `id`, including itself. */
export function ancestors(repo: Repo, id: string): Set<string> {
  const seen = new Set<string>()
  const stack = [id]
  while (stack.length) {
    const current = stack.pop() as string
    if (seen.has(current) || !repo.commits[current]) continue
    seen.add(current)
    stack.push(...repo.commits[current].parents)
  }
  return seen
}

/** Commits reachable from any branch, tag or HEAD. */
export function reachable(repo: Repo): Set<string> {
  const roots = [...Object.values(repo.branches), ...Object.values(repo.tags), headCommit(repo)]
  const all = new Set<string>()
  for (const root of roots) for (const id of ancestors(repo, root)) all.add(id)
  return all
}

/** Resolves a branch, tag, commit id, HEAD, HEAD~n or name^. */
export function resolve(repo: Repo, ref: string): string | undefined {
  const match = /^(.+?)((?:~\d*|\^)*)$/.exec(ref.trim())
  if (!match) return undefined
  const [, base, suffix] = match
  let id =
    base === 'HEAD'
      ? headCommit(repo)
      : (repo.branches[base] ??
        repo.tags[base] ??
        (repo.commits[base]
          ? base
          : repo.commits[base.toUpperCase()]
            ? base.toUpperCase()
            : undefined))
  if (!id) return undefined
  for (const step of suffix.match(/~\d*|\^/g) ?? []) {
    const count = step === '^' ? 1 : step === '~' ? 1 : Number(step.slice(1))
    for (let i = 0; i < count; i += 1) {
      id = repo.commits[id]?.parents[0]
      if (!id) return undefined
    }
  }
  return id
}

function newCommit(repo: Repo, parents: string[], message: string, copiedFrom?: string): string {
  const base = copiedFrom ? `${copiedFrom.replace(/'+$/, '')}` : `C${repo.seq}`
  let id = copiedFrom ? `${copiedFrom}'` : base
  while (repo.commits[id]) id = `${id}'`
  const lane = repo.head.branch ?? repo.commits[headCommit(repo)]?.lane ?? 'main'
  repo.commits[id] = {
    id,
    parents,
    message,
    seq: repo.seq,
    lane,
    ...(copiedFrom ? { copiedFrom } : {}),
  }
  repo.seq += 1
  return id
}

/** Moves HEAD's branch (or detached HEAD) to a commit. */
function advance(repo: Repo, id: string) {
  if (repo.head.branch) repo.branches[repo.head.branch] = id
  else repo.head.commit = id
}

const isAncestor = (repo: Repo, maybe: string, of: string) => ancestors(repo, of).has(maybe)

/** Splits a command line into words, keeping "quoted strings" together. */
export function words(line: string): string[] {
  return [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3])
}

const branchName = /^[A-Za-z0-9._/-]+$/

/** Runs one command. Never throws: errors come back as `ok: false`, like git's own messages. */
export function run(input: Repo, line: string): Result {
  const repo = clone(input)
  const fail = (output: string): Result => ({ repo: input, output, ok: false })
  const done = (output: string): Result => ({ repo, output, ok: true })
  const args = words(line.trim())
  if (args[0] === 'git') args.shift()
  const [command, ...rest] = args
  const flags = rest.filter((arg) => arg.startsWith('-'))
  const positional = rest.filter(
    (arg, index) => !arg.startsWith('-') && !(rest[index - 1] === '-m'),
  )
  const current = headCommit(repo)

  switch (command) {
    case undefined:
      return fail('Type a git command, e.g. git commit')
    case 'commit': {
      const messageIndex = rest.indexOf('-m')
      const message =
        messageIndex >= 0 ? (rest[messageIndex + 1] ?? 'Commit') : `Commit ${repo.seq}`
      if (flags.includes('--amend')) {
        const parents = repo.commits[current].parents
        const id = newCommit(repo, parents, message, current)
        advance(repo, id)
        return done(`Amended ${current} as ${id} (a new commit replaces it).`)
      }
      const id = newCommit(repo, [current], message)
      advance(repo, id)
      return done(`[${repo.head.branch ?? 'detached HEAD'} ${id}] ${message}`)
    }
    case 'branch': {
      if (positional.length === 0)
        return done(
          Object.keys(repo.branches)
            .map((name) => `${name === repo.head.branch ? '* ' : '  '}${name}`)
            .join('\n'),
        )
      const name = positional[0]
      if (flags.includes('-d') || flags.includes('-D')) {
        if (!repo.branches[name]) return fail(`error: branch '${name}' not found.`)
        if (name === repo.head.branch)
          return fail(`error: Cannot delete branch '${name}' checked out.`)
        if (flags.includes('-d') && !isAncestor(repo, repo.branches[name], current))
          return fail(
            `error: The branch '${name}' is not fully merged. Use -D to delete it anyway.`,
          )
        delete repo.branches[name]
        return done(`Deleted branch ${name}.`)
      }
      if (!branchName.test(name)) return fail(`fatal: '${name}' is not a valid branch name.`)
      if (repo.branches[name]) return fail(`fatal: a branch named '${name}' already exists.`)
      const start = positional[1] ? resolve(repo, positional[1]) : current
      if (!start) return fail(`fatal: not a valid object name: '${positional[1]}'.`)
      repo.branches[name] = start
      if (!repo.laneOrder.includes(name)) repo.laneOrder.push(name)
      return done(`Created branch ${name} at ${start}.`)
    }
    case 'checkout':
    case 'switch': {
      const create = flags.includes('-b') || flags.includes('-c') || flags.includes('-B')
      const target = positional[0]
      if (!target) return fail(`fatal: you must name a branch or commit.`)
      if (create) {
        if (repo.branches[target]) return fail(`fatal: a branch named '${target}' already exists.`)
        if (!branchName.test(target)) return fail(`fatal: '${target}' is not a valid branch name.`)
        const start = positional[1] ? resolve(repo, positional[1]) : current
        if (!start) return fail(`fatal: invalid reference: ${positional[1]}`)
        repo.branches[target] = start
        if (!repo.laneOrder.includes(target)) repo.laneOrder.push(target)
        repo.head = { branch: target }
        return done(`Switched to a new branch '${target}'`)
      }
      if (repo.branches[target]) {
        repo.head = { branch: target }
        return done(`Switched to branch '${target}'`)
      }
      if (command === 'switch' && !flags.includes('--detach'))
        return fail(
          `fatal: '${target}' is not a branch. Use git switch --detach ${target} to look at a commit.`,
        )
      const id = resolve(repo, target)
      if (!id) return fail(`error: pathspec '${target}' did not match any branch or commit.`)
      repo.head = { commit: id }
      return done(`HEAD is now at ${id} (detached HEAD). Commits made here belong to no branch.`)
    }
    case 'merge': {
      const name = positional[0]
      const other = name ? resolve(repo, name) : undefined
      if (!other) return fail(`merge: ${name ?? '(nothing)'} - not something we can merge`)
      if (isAncestor(repo, other, current)) return done('Already up to date.')
      if (flags.includes('--squash')) {
        const id = newCommit(repo, [current], `Squashed ${name}`)
        advance(repo, id)
        return done(
          `Squash commit ${id}: ${name}'s changes as one new commit on ${repo.head.branch ?? 'HEAD'} (the branch is not recorded as merged).`,
        )
      }
      if (isAncestor(repo, current, other) && !flags.includes('--no-ff')) {
        advance(repo, other)
        return done(`Fast-forward to ${other} - no merge commit needed.`)
      }
      if (flags.includes('--ff-only')) return fail('fatal: Not possible to fast-forward, aborting.')
      const id = newCommit(
        repo,
        [current, other],
        `Merge ${name} into ${repo.head.branch ?? 'HEAD'}`,
      )
      advance(repo, id)
      return done(`Merge made by the 'ort' strategy: ${id} has two parents (${current}, ${other}).`)
    }
    case 'rebase': {
      const name = positional[0]
      const onto = name ? resolve(repo, name) : undefined
      if (!onto) return fail(`fatal: invalid upstream '${name ?? ''}'`)
      if (isAncestor(repo, current, onto)) {
        advance(repo, onto)
        return done(`Fast-forwarded ${repo.head.branch ?? 'HEAD'} to ${name}.`)
      }
      const upstream = ancestors(repo, onto)
      // Commits on our side only, oldest first; merge commits are dropped, as git does.
      const mine = [...ancestors(repo, current)]
        .filter((id) => !upstream.has(id))
        .map((id) => repo.commits[id])
        .filter((commit) => commit.parents.length < 2)
        .sort((a, b) => a.seq - b.seq)
      if (mine.length === 0) return done('Current branch is up to date.')
      let tip = onto
      const copies: string[] = []
      for (const commit of mine) {
        tip = newCommit(repo, [tip], commit.message, commit.id)
        copies.push(tip)
      }
      advance(repo, tip)
      return done(
        `Successfully rebased ${repo.head.branch ?? 'HEAD'} onto ${name}: ${mine.map((commit) => commit.id).join(', ')} replayed as ${copies.join(', ')}. The originals are now unreachable.`,
      )
    }
    case 'cherry-pick': {
      if (positional.length === 0) return fail('fatal: no commit specified.')
      const picked: string[] = []
      for (const ref of positional) {
        const id = resolve(repo, ref)
        if (!id) return fail(`fatal: bad revision '${ref}'`)
        if (isAncestor(repo, id, headCommit(repo)))
          return fail(`${id} is already in this branch - nothing to pick.`)
        const copy = newCommit(repo, [headCommit(repo)], repo.commits[id].message, id)
        advance(repo, copy)
        picked.push(`${id} → ${copy}`)
      }
      return done(`Cherry-picked ${picked.join(', ')}.`)
    }
    case 'revert': {
      const id = positional[0] ? resolve(repo, positional[0]) : undefined
      if (!id) return fail(`fatal: bad revision '${positional[0] ?? ''}'`)
      if (!isAncestor(repo, id, current)) return fail(`${id} is not in this branch.`)
      const revert = newCommit(repo, [current], `Revert "${repo.commits[id].message}"`)
      advance(repo, revert)
      return done(
        `${revert} undoes ${id} with a new commit - history is kept, so it is safe on shared branches.`,
      )
    }
    case 'reset': {
      const ref = positional[0] ?? 'HEAD'
      const id = resolve(repo, ref)
      if (!id) return fail(`fatal: ambiguous argument '${ref}': unknown revision.`)
      const mode = flags.find((flag) => ['--soft', '--mixed', '--hard'].includes(flag)) ?? '--mixed'
      advance(repo, id)
      return done(
        `${repo.head.branch ?? 'HEAD'} now points at ${id} (${mode}). Commits after it are no longer on this branch.${mode === '--soft' ? ' --soft keeps their changes staged.' : mode === '--mixed' ? ' --mixed keeps their changes in the working tree, unstaged.' : ' --hard discards their changes too.'}`,
      )
    }
    case 'tag': {
      const name = positional[0]
      if (!name) return done(Object.keys(repo.tags).join('\n') || '(no tags)')
      if (flags.includes('-d')) {
        if (!repo.tags[name]) return fail(`error: tag '${name}' not found.`)
        delete repo.tags[name]
        return done(`Deleted tag '${name}'.`)
      }
      if (repo.tags[name]) return fail(`fatal: tag '${name}' already exists`)
      const id = positional[1] ? resolve(repo, positional[1]) : current
      if (!id) return fail(`fatal: Failed to resolve '${positional[1]}' as a valid ref.`)
      repo.tags[name] = id
      return done(`Tagged ${id} as ${name}.`)
    }
    case 'log': {
      const lines = [...ancestors(repo, current)]
        .map((id) => repo.commits[id])
        .sort((a, b) => b.seq - a.seq)
        .slice(0, 12)
        .map((commit) => `${commit.id} ${commit.message}`)
      return done(lines.join('\n'))
    }
    case 'status':
      return done(
        repo.head.branch
          ? `On branch ${repo.head.branch} at ${current}.`
          : `HEAD detached at ${current}.`,
      )
    default:
      return fail(
        `git: '${command}' is not supported here. Try commit, branch, checkout, switch, merge, rebase, cherry-pick, revert, reset, tag, log.`,
      )
  }
}

/** Runs several commands; stops at the first failure. */
export function runAll(repo: Repo, lines: string[]): Result {
  let result: Result = { repo, output: '', ok: true }
  for (const line of lines) {
    result = run(result.repo, line)
    if (!result.ok) return result
  }
  return result
}

/* ---------- Exercise checks ---------- */

export type GitCheck =
  | { type: 'branchExists'; branch: string }
  | { type: 'branchAbsent'; branch: string }
  | { type: 'headOn'; branch: string }
  | { type: 'contains'; branch: string; message: string }
  | { type: 'notContains'; branch: string; message: string }
  | { type: 'mergeCommit'; branch: string; from?: string }
  | { type: 'noMergeCommits'; branch: string }
  | { type: 'tagOn'; tag: string; branch: string }
  | { type: 'sameCommit'; a: string; b: string }
  | { type: 'commitsSince'; branch: string; base: string; count: number }
  | { type: 'messageAtTip'; branch: string; startsWith: string }

const messagesOn = (repo: Repo, branch: string) =>
  [...ancestors(repo, repo.branches[branch] ?? '')].map((id) => repo.commits[id].message)

export function checkPasses(repo: Repo, check: GitCheck): boolean {
  switch (check.type) {
    case 'branchExists':
      return check.branch in repo.branches
    case 'branchAbsent':
      return !(check.branch in repo.branches)
    case 'headOn':
      return repo.head.branch === check.branch
    case 'contains':
      return check.branch in repo.branches && messagesOn(repo, check.branch).includes(check.message)
    case 'notContains':
      return !messagesOn(repo, check.branch).includes(check.message)
    case 'mergeCommit': {
      if (!(check.branch in repo.branches)) return false
      return [...ancestors(repo, repo.branches[check.branch])].some((id) => {
        const commit = repo.commits[id]
        if (commit.parents.length < 2) return false
        return !check.from || commit.message.includes(check.from)
      })
    }
    case 'noMergeCommits':
      return (
        check.branch in repo.branches &&
        [...ancestors(repo, repo.branches[check.branch])].every(
          (id) => repo.commits[id].parents.length < 2,
        )
      )
    case 'tagOn':
      return check.tag in repo.tags && repo.tags[check.tag] === repo.branches[check.branch]
    case 'sameCommit':
      return Boolean(resolve(repo, check.a)) && resolve(repo, check.a) === resolve(repo, check.b)
    case 'commitsSince': {
      const tip = repo.branches[check.branch]
      const base = resolve(repo, check.base)
      if (!tip || !base) return false
      const baseSet = ancestors(repo, base)
      return [...ancestors(repo, tip)].filter((id) => !baseSet.has(id)).length === check.count
    }
    case 'messageAtTip': {
      const tip = repo.branches[check.branch]
      return Boolean(tip) && repo.commits[tip].message.startsWith(check.startsWith)
    }
  }
}

/* ---------- Layout ---------- */

export interface GraphNode {
  id: string
  x: number
  y: number
  lane: string
  reachable: boolean
  message: string
}

/**
 * Columns are creation order; rows are lanes (one per branch, in the order
 * branches were made). Simple, stable as you type, and readable on a phone.
 */
export function layout(repo: Repo): { nodes: GraphNode[]; lanes: string[] } {
  const live = reachable(repo)
  const lanes = [...repo.laneOrder]
  for (const commit of Object.values(repo.commits))
    if (!lanes.includes(commit.lane)) lanes.push(commit.lane)
  const ordered = Object.values(repo.commits).sort((a, b) => a.seq - b.seq)
  return {
    lanes,
    nodes: ordered.map((commit, index) => ({
      id: commit.id,
      x: index,
      y: lanes.indexOf(commit.lane),
      lane: commit.lane,
      reachable: live.has(commit.id),
      message: commit.message,
    })),
  }
}

/** A check in words, for the exercise checklist. */
export function describeCheck(check: GitCheck): string {
  switch (check.type) {
    case 'branchExists':
      return `Branch **${check.branch}** exists`
    case 'branchAbsent':
      return `Branch **${check.branch}** is deleted`
    case 'headOn':
      return `You are on **${check.branch}**`
    case 'contains':
      return `**${check.branch}** contains "${check.message}"`
    case 'notContains':
      return `**${check.branch}** does not contain "${check.message}"`
    case 'mergeCommit':
      return `**${check.branch}** has a merge commit${check.from ? ` of **${check.from}**` : ''}`
    case 'noMergeCommits':
      return `**${check.branch}** is a straight line (no merge commits)`
    case 'tagOn':
      return `Tag **${check.tag}** is on the tip of **${check.branch}**`
    case 'sameCommit':
      return `**${check.a}** and **${check.b}** point at the same commit`
    case 'commitsSince':
      return `**${check.branch}** has ${check.count} commit${check.count === 1 ? '' : 's'} that **${check.base}** doesn't`
    case 'messageAtTip':
      return `The newest commit on **${check.branch}** is "${check.startsWith}…"`
  }
}
