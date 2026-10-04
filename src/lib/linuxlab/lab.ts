import { Bash } from 'just-bash'
import { labCommands, remoteShell, type LabContext } from './commands'
import { LabFs, seedFs } from './fs'
import { labTimeZone } from './time'
import { splatCommandFix } from './transform'
import { buildWorld, type Variant, type World } from './world'

/**
 * One lab environment: a seeded world, its filesystem and a bash shell with
 * the mock tools. `run` behaves like typing a line into a terminal - the
 * working directory, variables and functions carry over between commands,
 * which a plain just-bash `exec` does not do on its own.
 */

export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
  timedOut?: boolean
}

const MARK = {
  vars: '\u001eLABVARS\u001e',
  funcs: '\u001eLABFUNCS\u001e',
  cwd: '\u001eLABCWD\u001e',
}

/** Shell variables that describe the shell itself and must not be carried over. */
const SKIP = new Set([
  'PWD',
  'OLDPWD',
  'SHELLOPTS',
  'BASHOPTS',
  'PIPESTATUS',
  'HOSTNAME',
  'HOSTTYPE',
  'IFS',
  'PPID',
  'UID',
  'EUID',
  'SHLVL',
  'RANDOM',
  'LINENO',
  'SECONDS',
  '_',
  'OPTIND',
  'OPTERR',
  'PS1',
  'PS2',
  'PS4',
  'MACHTYPE',
  'OSTYPE',
  'GROUPS',
  'FUNCNAME',
  'HOME',
  'USER',
  'PATH',
  'LOGNAME',
  'TERM',
  'LANG',
  'TZ',
  '__lab_rc',
  'BASHPID',
  'EPOCHSECONDS',
  'EPOCHREALTIME',
  'COLUMNS',
  'LINES',
])

export class LinuxLab {
  readonly world: World
  readonly fs: LabFs
  cwd = '/root'
  private readonly bash: Bash
  private state = ''
  private readonly remotes = new Map<string, Promise<Bash>>()

  private constructor(world: World, fs: LabFs) {
    this.world = world
    this.fs = fs
    const context: LabContext = {
      world,
      fs,
      remote: (host) => {
        let shell = this.remotes.get(host.name)
        if (!shell) {
          shell = remoteShell(host, world)
          this.remotes.set(host.name, shell)
        }
        return shell
      },
    }
    this.bash = new Bash({
      fs,
      cwd: '/root',
      env: {
        HOME: '/root',
        USER: 'root',
        LOGNAME: 'root',
        TERM: 'xterm-256color',
        LANG: 'C.UTF-8',
        TZ: labTimeZone(),
      },
      customCommands: labCommands(context),
    })
    this.bash.registerTransformPlugin(splatCommandFix)
  }

  /** A fresh environment for a variant, seeded relative to `now`. */
  static async create(variant: Variant = 'main', now = Date.now()): Promise<LinuxLab> {
    const world = buildWorld(variant, now)
    const fs = new LabFs()
    await seedFs(fs, world)
    return new LinuxLab(world, fs)
  }

  /** Runs one terminal line (or a multi-line script) and keeps shell state. */
  async run(
    command: string,
    options: { timeoutMs?: number; stdin?: string } = {},
  ): Promise<RunResult> {
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, options.timeoutMs ?? 8000)
    const script = [
      this.state,
      command,
      '__lab_rc=$?',
      `printf '${MARK.vars}'`,
      'declare -p',
      `printf '${MARK.funcs}'`,
      // declare -f prints placeholder bodies here; type prints the real source.
      'for __lab_f in $(declare -F | cut -d" " -f3); do type "$__lab_f" | tail -n +2; done',
      `printf '${MARK.cwd}%s' "$PWD"`,
      'exit $__lab_rc',
    ].join('\n')
    try {
      const result = await this.bash.exec(script, {
        cwd: this.cwd,
        signal: controller.signal,
        rawScript: true,
        stdin: options.stdin,
      })
      // just-bash stops runaway loops by counting commands; say so in plain words.
      const runaway = /too many commands executed|too many iterations|maximum call stack/i.test(
        result.stderr,
      )
      const stderr = runaway
        ? 'lab: stopped - this looks like an endless loop (or a very long one).\n'
        : result.stderr
      return {
        ...this.absorb(result.stdout),
        stderr,
        exitCode: timedOut ? 124 : result.exitCode,
        ...(timedOut || runaway ? { timedOut: true } : {}),
      }
    } catch (error) {
      return {
        stdout: '',
        stderr: timedOut
          ? 'lab: command stopped after 8 seconds (an endless loop?)\n'
          : `lab: ${error instanceof Error ? error.message : String(error)}\n`,
        exitCode: timedOut ? 124 : 1,
        ...(timedOut ? { timedOut } : {}),
      }
    } finally {
      clearTimeout(timer)
    }
  }

  /** Splits the state trailer off the output and remembers cwd, variables and functions. */
  private absorb(stdout: string): { stdout: string } {
    const at = stdout.indexOf(MARK.vars)
    if (at < 0) return { stdout } // the command exited before the trailer
    const trailer = stdout.slice(at)
    const visible = stdout.slice(0, at)
    const vars = trailer.slice(MARK.vars.length, trailer.indexOf(MARK.funcs))
    const funcs = trailer.slice(
      trailer.indexOf(MARK.funcs) + MARK.funcs.length,
      trailer.indexOf(MARK.cwd),
    )
    const cwd = trailer.slice(trailer.indexOf(MARK.cwd) + MARK.cwd.length).trim()
    const kept = vars
      .split(/\n(?=declare -)/)
      .filter((entry) => {
        const match = /^declare -(\S+) ([A-Za-z_][A-Za-z0-9_]*)/.exec(entry.trim())
        return (
          match !== null &&
          !match[1].includes('r') &&
          !SKIP.has(match[2]) &&
          !match[2].startsWith('BASH')
        )
      })
      .map((entry) => entry.trim())
    this.state = [...kept, funcs.trim()].filter(Boolean).join('\n')
    if (cwd) this.cwd = cwd
    return { stdout: visible }
  }

  async writeFile(path: string, content: string) {
    const dir = path.replace(/\/[^/]+$/, '') || '/'
    await this.fs.mkdir(dir, { recursive: true })
    await this.fs.writeFile(path, content)
  }

  async readFile(path: string): Promise<string | null> {
    try {
      return await this.fs.readFile(path)
    } catch {
      return null
    }
  }

  /** Every file path under a directory (recursively), sorted. */
  async listFiles(dir: string): Promise<string[]> {
    const out: string[] = []
    const walk = async (path: string) => {
      let entries: string[]
      try {
        entries = await this.fs.readdir(path)
      } catch {
        return
      }
      for (const name of entries) {
        const full = `${path === '/' ? '' : path}/${name}`
        const stat = await this.fs.stat(full)
        if (stat.isDirectory) {
          out.push(`${full}/`)
          await walk(full)
        } else out.push(full)
      }
    }
    await walk(dir.replace(/\/$/, '') || '/')
    return out.sort()
  }
}
