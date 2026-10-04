import { Bash, defineCommand, InMemoryFs, type CustomCommand } from 'just-bash'
import jmespath from 'jmespath'
import { certPem, type LabFs } from './fs'
import { DAY, type Host, type World } from './world'
import { labTimeZone, localClock, localDay, offsetText } from './time'
import { splatCommandFix } from './transform'

/**
 * The lab's mock tools. Everything that cannot run in a browser - the
 * network, systemd, processes, containers, the cloud - answers from the
 * world's state with realistic output and real exit codes. Alerts (mail,
 * Slack) land in the world's outbox, where the checks can see them.
 */

type Result = { stdout: string; stderr: string; exitCode: number }
type Ctx = Parameters<Parameters<typeof defineCommand>[1]>[1]

const ok = (stdout = '', stderr = ''): Result => ({ stdout, stderr, exitCode: 0 })
const fail = (code: number, stderr: string, stdout = ''): Result => ({
  stdout,
  stderr,
  exitCode: code,
})
/**
 * Pipes carry bytes as a latin1 string (one char per byte); decode them as
 * UTF-8. (just-bash's own decoder isn't exported from its browser bundle.)
 */
const utf8 = new TextDecoder('utf-8', { fatal: true })
const stdinText = (ctx: Ctx) => {
  const raw = String(ctx.stdin ?? '')
  try {
    return utf8.decode(Uint8Array.from(raw, (char) => char.charCodeAt(0) & 0xff))
  } catch {
    return raw
  }
}
const lines = (text: string) => text.split('\n').filter((line) => line.length > 0)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (value: number | string, width: number, right = false) =>
  right ? String(value).padEnd(width) : String(value).padStart(width)

/** Human sizes the way coreutils prints them (-h): 1K units, one decimal under 10. */
export function human(bytes: number): string {
  const units = ['', 'K', 'M', 'G', 'T']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  if (unit === 0) return String(Math.round(value))
  return `${value < 10 ? (Math.ceil(value * 10 - 1e-9) / 10).toFixed(1) : Math.ceil(value - 1e-9)}${units[unit]}`
}

/** Splits "-c 1 -W 2 host" style args into flags and positionals. */
function parse(args: string[], withValue: string[]) {
  const flags = new Map<string, string>()
  const rest: string[] = []
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, ...value] = arg.split('=')
      flags.set(key, value.join('='))
    } else if (withValue.includes(arg)) {
      flags.set(arg, args[i + 1] ?? '')
      i += 1
    } else if (
      /^-[A-Za-z]/.test(arg) &&
      withValue.some((flag) => arg.startsWith(flag) && flag.length === 2 && arg.length > 2)
    ) {
      flags.set(arg.slice(0, 2), arg.slice(2))
    } else if (arg.startsWith('-') && arg.length > 1) {
      flags.set(arg, 'true')
    } else {
      rest.push(arg)
    }
  }
  return { flags, rest }
}

const shellQuote = (value: string) =>
  /^[\w./:=@%+-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`

export interface LabContext {
  world: World
  fs: LabFs
  /** A shell on a remote host, created on first ssh. */
  remote: (host: Host) => Promise<Bash>
}

/* ---------- name resolution ---------- */

function resolve(
  world: World,
  name: string,
): { ip: string; host?: Host; domain?: World['domains'][number] } | null {
  const bare = name.replace(/^.*@/, '').replace(/\.$/, '')
  if (bare === 'localhost' || bare === '127.0.0.1' || bare === 'lab-01') return { ip: '127.0.0.1' }
  const host = world.hosts.find(
    (entry) => entry.ip === bare || entry.name === bare || `${entry.name}.internal` === bare,
  )
  if (host) return { ip: host.ip, host }
  const domain = world.domains.find((entry) => entry.name === bare)
  if (domain && domain.ip) return { ip: domain.ip, domain }
  return null
}

/* ---------- network ---------- */

function ping(lab: LabContext) {
  return defineCommand('ping', async (args) => {
    const { flags, rest } = parse(args, ['-c', '-W', '-w', '-i', '-s'])
    const target = rest[rest.length - 1]
    if (!target) return fail(2, 'ping: usage error: Destination address required\n')
    const found = resolve(lab.world, target)
    if (!found) return fail(2, `ping: ${target}: Name or service not known\n`)
    const count = Number(flags.get('-c') ?? 4)
    const up =
      found.ip === '127.0.0.1' || (found.host ? found.host.up : Boolean(found.domain?.status))
    const head = `PING ${target} (${found.ip}) 56(84) bytes of data.\n`
    if (!up) {
      return fail(
        1,
        '',
        `${head}\n--- ${target} ping statistics ---\n${count} packets transmitted, 0 received, 100% packet loss, time ${count * 1000 - 1000}ms\n\n`,
      )
    }
    const replies = Array.from(
      { length: count },
      (_, i) => `64 bytes from ${found.ip}: icmp_seq=${i + 1} ttl=64 time=0.${40 + i} ms`,
    ).join('\n')
    return ok(
      `${head}${replies}\n\n--- ${target} ping statistics ---\n${count} packets transmitted, ${count} received, 0% packet loss, time ${count * 1000 - 1000}ms\nrtt min/avg/max/mdev = 0.400/0.420/0.460/0.020 ms\n`,
    )
  })
}

function sshTarget(args: string[]) {
  const withValue = ['-o', '-i', '-p', '-l', '-F', '-J', '-P']
  const options: string[] = []
  let i = 0
  let port = '22'
  for (; i < args.length; i += 1) {
    const arg = args[i]
    if (withValue.includes(arg)) {
      if (arg === '-o') options.push(args[i + 1])
      if (arg === '-p' || arg === '-P') port = args[i + 1]
      i += 1
    } else if (arg.startsWith('-o') && arg.length > 2) options.push(arg.slice(2))
    else if (arg.startsWith('-')) continue
    else break
  }
  return { destination: args[i], rest: args.slice(i + 1), options, port }
}

function connect(
  lab: LabContext,
  destination: string,
  port: string,
): { host?: Host; error?: Result } {
  const name = destination.replace(/^.*@/, '')
  const found = resolve(lab.world, name)
  if (!found || !found.host)
    return {
      error: fail(255, `ssh: Could not resolve hostname ${name}: Name or service not known\n`),
    }
  const host = found.host
  if (!host.up || host.ssh === 'timeout')
    return { error: fail(255, `ssh: connect to host ${name} port ${port}: Connection timed out\n`) }
  if (host.ssh === 'refused')
    return { error: fail(255, `ssh: connect to host ${name} port ${port}: Connection refused\n`) }
  if (host.ssh === 'auth') {
    const user = destination.includes('@') ? destination.split('@')[0] : 'root'
    return { error: fail(255, `${user}@${name}: Permission denied (publickey,password).\n`) }
  }
  return { host }
}

function ssh(lab: LabContext) {
  return defineCommand('ssh', async (args, ctx) => {
    const { destination, rest, port } = sshTarget(args)
    if (!destination) return fail(255, 'usage: ssh [-o option] [user@]hostname [command]\n')
    const { host, error } = connect(lab, destination, port)
    if (error || !host) return error as Result
    if (rest.length === 0) {
      return ok(
        '',
        `(lab) Interactive sessions are not simulated. Run a command instead, e.g. ssh ${destination} 'df -h /'\n`,
      )
    }
    const result = await (await lab.remote(host)).exec(rest.join(' '), { stdin: stdinText(ctx) })
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }
  })
}

function scp(lab: LabContext) {
  return defineCommand('scp', async (args, ctx) => {
    const paths = args.filter(
      (arg, i) => !arg.startsWith('-') && !['-P', '-i', '-o'].includes(args[i - 1]),
    )
    if (paths.length < 2)
      return fail(1, 'usage: scp [-P port] [[user@]host1:]file1 ... [[user@]host2:]file2\n')
    const target = paths[paths.length - 1]
    const isRemote = (path: string) => /^[^/]*:/.test(path)
    const localPath = (path: string) => (path.startsWith('/') ? path : `${ctx.cwd}/${path}`)
    for (const source of paths.slice(0, -1)) {
      if (isRemote(source)) {
        const [destination, remotePath] = [
          source.slice(0, source.indexOf(':')),
          source.slice(source.indexOf(':') + 1),
        ]
        const { host, error } = connect(lab, destination, '22')
        if (error || !host) return fail(1, `${error?.stderr ?? ''}scp: Connection closed\n`)
        const remote = await lab.remote(host)
        const listed = await remote.exec(`ls -d ${remotePath}`)
        if (listed.exitCode !== 0) return fail(1, `scp: ${remotePath}: No such file or directory\n`)
        for (const file of lines(listed.stdout)) {
          const content = (await remote.exec(`cat ${shellQuote(file)}`)).stdout
          let destinationPath = localPath(target)
          try {
            const stat = await lab.fs.stat(destinationPath)
            if (stat.isDirectory)
              destinationPath = `${destinationPath.replace(/\/$/, '')}/${file.split('/').pop()}`
          } catch {
            /* a new file path */
          }
          await lab.fs.writeFile(destinationPath, content)
        }
      } else if (isRemote(target)) {
        const [destination, remotePath] = [
          target.slice(0, target.indexOf(':')),
          target.slice(target.indexOf(':') + 1),
        ]
        const { host, error } = connect(lab, destination, '22')
        if (error || !host) return fail(1, `${error?.stderr ?? ''}scp: Connection closed\n`)
        const content = await lab.fs.readFile(localPath(source))
        const name = source.split('/').pop()
        const remoteFile =
          remotePath.endsWith('/') || remotePath === ''
            ? `${remotePath || '~/'}${name}`
            : remotePath
        await (
          await lab.remote(host)
        ).exec(`cat > ${shellQuote(remoteFile.replace(/^~\//, '/root/'))}`, { stdin: content })
      } else {
        return fail(1, 'scp: (lab) copy between local paths with cp\n')
      }
    }
    return ok()
  })
}

function nc(lab: LabContext) {
  return defineCommand('nc', async (args) => {
    const { flags, rest } = parse(args, ['-w', '-W', '-p'])
    const [name, port] = rest
    if (!name || !port) return fail(1, 'usage: nc [-zv] [-w timeout] host port\n')
    const verbose = flags.has('-v') || flags.has('-zv') || flags.has('-vz')
    const found = resolve(lab.world, name)
    if (!found)
      return fail(1, `nc: getaddrinfo for host "${name}" port ${port}: Name or service not known\n`)
    const p = Number(port)
    let open = false
    let timeout = false
    if (found.ip === '127.0.0.1') open = lab.world.processes.some((proc) => proc.port === p)
    else if (found.host) {
      if (!found.host.up) timeout = true
      else
        open =
          p === 22
            ? found.host.ssh !== 'refused'
            : [80, 443].includes(p)
              ? found.host.nginx === 'active'
              : false
    } else if (found.domain) {
      if (found.domain.status === 0) timeout = true
      else open = p === 443 || p === 80
    }
    if (open)
      return ok(
        '',
        verbose ? `Connection to ${name} (${found.ip}) ${port} port [tcp/*] succeeded!\n` : '',
      )
    return fail(
      1,
      `nc: connect to ${name} (${found.ip}) port ${port} (tcp) failed: ${timeout ? 'Connection timed out' : 'Connection refused'}\n`,
    )
  })
}

function curl(lab: LabContext) {
  return defineCommand('curl', async (args, ctx) => {
    const withValue = [
      '-o',
      '-w',
      '-X',
      '-H',
      '-d',
      '-m',
      '--data',
      '--data-raw',
      '--data-binary',
      '--max-time',
      '--connect-timeout',
      '--output',
      '--write-out',
      '--request',
      '--header',
      '-u',
      '--user',
      '-A',
    ]
    const { flags, rest } = parse(args, withValue)
    const url =
      rest.find((arg) => /^https?:\/\//.test(arg) || /^[\w.-]+(:\d+)?\//.test(arg)) ?? rest[0]
    if (!url) return fail(2, 'curl: no URL specified!\n')
    const silent = [...flags.keys()].some(
      (flag) => /^-[a-zA-Z]*s/.test(flag) && !flag.startsWith('--'),
    )
    const showErrors = [...flags.keys()].some((flag) => /^-[a-zA-Z]*S/.test(flag))
    const failOnError =
      [...flags.keys()].some((flag) => /^-[a-zA-Z]*f/.test(flag) && !flag.startsWith('--')) ||
      flags.has('--fail')
    const head = flags.has('-I') || flags.has('--head')
    const insecure = flags.has('-k') || flags.has('--insecure')
    const data =
      flags.get('-d') ??
      flags.get('--data') ??
      flags.get('--data-raw') ??
      flags.get('--data-binary')
    const writeOut = flags.get('-w') ?? flags.get('--write-out')
    const output = flags.get('-o') ?? flags.get('--output')
    const parsed = (() => {
      try {
        return new URL(/^https?:\/\//.test(url) ? url : `http://${url}`)
      } catch {
        return null
      }
    })()
    if (!parsed) return fail(3, `curl: (3) URL rejected: Malformed input to a URL function\n`)

    const finish = (status: number, body: string, code = 0, error = ''): Result => {
      let stdout = ''
      if (status > 0) {
        if (head)
          stdout = `HTTP/2 ${status}\ncontent-type: ${body.startsWith('{') ? 'application/json' : 'text/html'}\ncontent-length: ${body.length}\n\n`
        else if (!output) stdout = body
      }
      if (output && output !== '/dev/null' && status > 0 && !head) {
        void lab.fs.writeFile(output.startsWith('/') ? output : `${ctx.cwd}/${output}`, body)
      }
      if (failOnError && status >= 400) {
        code = 22
        error = `curl: (22) The requested URL returned error: ${status}\n`
        stdout = ''
      }
      if (writeOut) {
        stdout += writeOut
          .replace(/%\{http_code\}|%\{response_code\}/g, status > 0 ? String(status) : '000')
          .replace(/%\{time_total\}/g, status > 0 ? '0.142' : '5.002')
          .replace(/%\{url_effective\}/g, url)
          .replace(/%\{size_download\}/g, String(status > 0 ? body.length : 0))
          .replace(/\\n/g, '\n')
      }
      const stderr = code !== 0 && (!silent || showErrors) ? error : ''
      return { stdout, stderr, exitCode: code }
    }

    // Webhooks: Slack and friends go to the outbox.
    if (/hooks\.slack\.com|webhook|\/hooks\//.test(parsed.hostname + parsed.pathname)) {
      let text = data ?? ''
      try {
        const json = JSON.parse(data ?? '')
        text = typeof json.text === 'string' ? json.text : JSON.stringify(json)
      } catch {
        /* plain body */
      }
      lab.world.outbox.push({
        channel: parsed.hostname.includes('slack') ? 'slack' : 'webhook',
        to: `${parsed.hostname}${parsed.pathname}`,
        subject: text.split('\n')[0].slice(0, 80),
        body: text,
        at: lab.world.now,
      })
      return finish(200, 'ok')
    }

    const found = resolve(lab.world, parsed.hostname)
    if (!found) return finish(0, '', 6, `curl: (6) Could not resolve host: ${parsed.hostname}\n`)
    const port = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 80))
    if (found.ip === '127.0.0.1') {
      const listening = lab.world.processes.find((proc) => proc.port === port)
      return listening
        ? finish(200, '{"status":"UP"}\n')
        : finish(
            0,
            '',
            7,
            `curl: (7) Failed to connect to localhost port ${port} after 0 ms: Couldn't connect to server\n`,
          )
    }
    if (found.host) {
      if (!found.host.up)
        return finish(0, '', 28, `curl: (28) Connection timed out after 5001 milliseconds\n`)
      if (found.host.nginx !== 'active')
        return finish(
          0,
          '',
          7,
          `curl: (7) Failed to connect to ${parsed.hostname} port ${port} after 1 ms: Couldn't connect to server\n`,
        )
      return finish(200, '<html><body>ok</body></html>\n')
    }
    const domain = found.domain
    if (!domain || domain.status === 0)
      return finish(0, '', 28, `curl: (28) Connection timed out after 5001 milliseconds\n`)
    if (
      parsed.protocol === 'https:' &&
      domain.certDays !== null &&
      domain.certDays < 0 &&
      !insecure
    ) {
      return finish(
        0,
        '',
        60,
        `curl: (60) SSL certificate problem: certificate has expired\nMore details here: https://curl.se/docs/sslcerts.html\n`,
      )
    }
    const body =
      domain.status === 200
        ? '{"status":"ok"}\n'
        : `<html><head><title>${domain.status}</title></head><body>${domain.status}</body></html>\n`
    return finish(domain.status, body)
  })
}

function mail(lab: LabContext, name: string) {
  return defineCommand(name, async (args, ctx) => {
    const { flags, rest } = parse(args, ['-s', '-r', '-a', '-c', '-b'])
    const subject = flags.get('-s') ?? '(no subject)'
    if (rest.length === 0) return fail(1, `${name}: no recipients specified\n`)
    lab.world.outbox.push({
      channel: 'mail',
      to: rest.join(', '),
      subject,
      body: stdinText(ctx),
      at: lab.world.now,
    })
    return ok()
  })
}

function sendmail(lab: LabContext) {
  return defineCommand('sendmail', async (args, ctx) => {
    const text = stdinText(ctx)
    const headerTo = /^To:\s*(.+)$/im.exec(text)?.[1]
    const to = args.filter((arg) => !arg.startsWith('-')).join(', ') || headerTo || ''
    if (!to) return fail(1, 'sendmail: no recipients\n')
    const subject = /^Subject:\s*(.+)$/im.exec(text)?.[1] ?? '(no subject)'
    lab.world.outbox.push({
      channel: 'mail',
      to,
      subject,
      body: text.replace(/^[\s\S]*?\n\n/, ''),
      at: lab.world.now,
    })
    return ok()
  })
}

function getent(lab: LabContext) {
  return defineCommand('getent', async (args) => {
    const [database, key] = args
    if (database === 'hosts' || database === 'ahosts') {
      const found = key ? resolve(lab.world, key) : null
      return found
        ? ok(`${found.ip}${' '.repeat(Math.max(1, 16 - found.ip.length))}${key}\n`)
        : fail(2, '')
    }
    if (database === 'passwd' || database === 'group') {
      const text = await lab.fs.readFile('/etc/passwd').catch(() => '')
      const rows = lines(text)
      if (!key) return ok(rows.join('\n') + '\n')
      const row = rows.find((line) => line.split(':')[0] === key)
      if (!row) return fail(2, '')
      if (database === 'group') {
        const [user, , , gid] = row.split(':')
        return ok(`${user}:x:${gid}:\n`)
      }
      return ok(`${row}\n`)
    }
    return fail(1, `Unknown database: ${database}\n`)
  })
}

function nslookup(lab: LabContext) {
  return defineCommand('nslookup', async (args) => {
    const name = args.find((arg) => !arg.startsWith('-'))
    if (!name) return fail(1, 'usage: nslookup host\n')
    const found = resolve(lab.world, name)
    const header = 'Server:\t\t10.0.0.2\nAddress:\t10.0.0.2#53\n\n'
    if (!found) return fail(1, '', `${header}** server can't find ${name}: NXDOMAIN\n\n`)
    return ok(`${header}Non-authoritative answer:\nName:\t${name}\nAddress: ${found.ip}\n\n`)
  })
}

function host(lab: LabContext) {
  return defineCommand('host', async (args) => {
    const name = args.find((arg) => !arg.startsWith('-'))
    if (!name) return fail(1, 'usage: host name\n')
    const found = resolve(lab.world, name)
    return found
      ? ok(`${name} has address ${found.ip}\n`)
      : fail(1, '', `Host ${name} not found: 3(NXDOMAIN)\n`)
  })
}

function dig(lab: LabContext) {
  return defineCommand('dig', async (args) => {
    const name = args.find(
      (arg) => !arg.startsWith('-') && !arg.startsWith('+') && !arg.startsWith('@') && arg !== 'A',
    )
    const found = name ? resolve(lab.world, name) : null
    if (args.includes('+short')) return ok(found ? `${found.ip}\n` : '')
    return ok(
      `;; ->>HEADER<<- opcode: QUERY, status: ${found ? 'NOERROR' : 'NXDOMAIN'}\n;; ANSWER SECTION:\n${found ? `${name}.\t\t300\tIN\tA\t${found.ip}\n` : ''}`,
    )
  })
}

function certEnd(world: World, name: string): Date | null {
  const domain = world.domains.find((entry) => entry.name === name)
  if (!domain || domain.certDays === null) return null
  const end = new Date(Math.floor(world.now / DAY) * DAY + domain.certDays * DAY + 12 * 3_600_000)
  return end
}

const opensslDate = (date: Date) =>
  `${MONTHS[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, ' ')} ${date.toISOString().slice(11, 19)} ${date.getUTCFullYear()} GMT`

function openssl(lab: LabContext) {
  return defineCommand('openssl', async (args, ctx) => {
    const [sub, ...rest] = args
    if (sub === 's_client') {
      const { flags } = parse(rest, ['-connect', '-servername', '-showcerts'])
      const target = flags.get('-connect') ?? ''
      const name = flags.get('-servername') ?? target.split(':')[0]
      const found = resolve(lab.world, target.split(':')[0])
      if (!found || !found.domain)
        return fail(1, `${target.split(':')[0]}: Name or service not known\nconnect:errno=2\n`)
      if (found.domain.status === 0 || found.domain.certDays === null)
        return fail(1, `connect: Connection timed out\nconnect:errno=110\n`)
      return ok(
        `CONNECTED(00000003)\n---\nCertificate chain\n 0 s:CN = ${name}\n   i:C = US, O = Lab CA, CN = Lab Issuing CA\n---\nServer certificate\n${certPem(found.domain.name)}subject=CN = ${name}\n---\n`,
        `depth=0 CN = ${name}\nverify return:1\n`,
      )
    }
    if (sub === 'x509') {
      const { flags } = parse(rest, ['-in', '-checkend', '-inform'])
      const text = flags.has('-in')
        ? await lab.fs.readFile(flags.get('-in') as string).catch(() => '')
        : stdinText(ctx)
      const name = /LAB-CERT:(\S+)/.exec(text)?.[1]
      if (!name) return fail(1, 'unable to load certificate\n')
      const end = certEnd(lab.world, name)
      if (!end) return fail(1, 'unable to load certificate\n')
      const start = new Date(end.getTime() - 397 * DAY)
      const out: string[] = []
      if (flags.has('-subject')) out.push(`subject=CN = ${name}`)
      if (flags.has('-issuer')) out.push('issuer=C = US, O = Lab CA, CN = Lab Issuing CA')
      if (flags.has('-dates'))
        out.push(`notBefore=${opensslDate(start)}`, `notAfter=${opensslDate(end)}`)
      else if (flags.has('-enddate')) out.push(`notAfter=${opensslDate(end)}`)
      if (flags.has('-startdate') && !flags.has('-dates'))
        out.push(`notBefore=${opensslDate(start)}`)
      if (flags.has('-checkend')) {
        const seconds = Number(flags.get('-checkend'))
        const expires = end.getTime() < lab.world.now + seconds * 1000
        return {
          stdout:
            [...out, expires ? 'Certificate will expire' : 'Certificate will not expire'].join(
              '\n',
            ) + '\n',
          stderr: '',
          exitCode: expires ? 1 : 0,
        }
      }
      return ok(out.length ? out.join('\n') + '\n' : text)
    }
    if (sub === 'version')
      return ok('OpenSSL 3.0.13 30 Jan 2024 (Library: OpenSSL 3.0.13 30 Jan 2024)\n')
    return fail(1, `(lab) openssl ${sub ?? ''} is not simulated - try s_client or x509\n`)
  })
}

/* ---------- processes, services, system ---------- */

function psCommand(lab: LabContext) {
  return defineCommand('ps', async (args) => {
    const procs = [...lab.world.processes]
    const joined = args.join(' ')
    const sortArg = /--sort[= ]([-+]?[\w%]+)/.exec(joined)?.[1]
    if (sortArg) {
      const descending = sortArg.startsWith('-')
      const key = sortArg.replace(/^[-+]/, '')
      const value = (proc: (typeof procs)[number]) =>
        key === '%cpu' || key === 'pcpu'
          ? proc.cpu
          : key === '%mem' || key === 'pmem'
            ? proc.mem
            : key === 'rss'
              ? proc.rssKb
              : key === 'pid'
                ? proc.pid
                : 0
      procs.sort((a, b) => (descending ? value(b) - value(a) : value(a) - value(b)))
    }
    const formatIndex = args.findIndex(
      (arg) => arg === '-o' || arg === 'o' || arg === '-eo' || arg === '-ao' || arg === '--format',
    )
    if (formatIndex >= 0) {
      const fields = (args[formatIndex + 1] ?? '').split(',').filter(Boolean)
      const header: Record<string, string> = {
        pid: 'PID',
        ppid: 'PPID',
        user: 'USER',
        '%cpu': '%CPU',
        pcpu: '%CPU',
        '%mem': '%MEM',
        pmem: '%MEM',
        rss: 'RSS',
        comm: 'COMMAND',
        cmd: 'CMD',
        args: 'COMMAND',
        command: 'COMMAND',
      }
      const cell = (proc: (typeof procs)[number], field: string) => {
        switch (field) {
          case 'pid':
            return String(proc.pid)
          case 'ppid':
            return proc.pid === 1 ? '0' : '1'
          case 'user':
            return proc.user
          case '%cpu':
          case 'pcpu':
            return proc.cpu.toFixed(1)
          case '%mem':
          case 'pmem':
            return proc.mem.toFixed(1)
          case 'rss':
            return String(proc.rssKb)
          case 'comm':
            return proc.command.split(' ')[0].split('/').pop()?.replace(/:$/, '') ?? ''
          default:
            return proc.command
        }
      }
      const rows = [
        fields.map((field) => header[field] ?? field.toUpperCase()),
        ...procs.map((proc) => fields.map((field) => cell(proc, field))),
      ]
      const widths = fields.map((_, i) => Math.max(...rows.map((row) => row[i].length)))
      return ok(
        rows
          .map((row) =>
            row
              .map((value, i) =>
                i === row.length - 1
                  ? value
                  : pad(value, widths[i], /user|comm|cmd|args|command/.test(fields[i])),
              )
              .join(' '),
          )
          .join('\n') + '\n',
      )
    }
    if (args.includes('-ef') || (args.includes('-e') && args.includes('-f'))) {
      return ok(
        [
          'UID          PID    PPID  C STIME TTY          TIME CMD',
          ...procs.map(
            (proc) =>
              `${pad(proc.user, 8, true)} ${pad(proc.pid, 7)} ${pad(proc.pid === 1 ? 0 : 1, 7)}  0 09:12 ?        00:00:0${Math.round(proc.cpu / 20)} ${proc.command}`,
          ),
        ].join('\n') + '\n',
      )
    }
    // aux (the default here)
    return ok(
      [
        'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
        ...procs.map(
          (proc) =>
            `${pad(proc.user, 10, true)} ${pad(proc.pid, 5)} ${pad(proc.cpu.toFixed(1), 4)} ${pad(proc.mem.toFixed(1), 4)} ${pad(proc.rssKb * 2, 6)} ${pad(proc.rssKb, 5)} ?        Ssl  09:12   0:0${Math.round(proc.cpu / 20)} ${proc.command}`,
        ),
      ].join('\n') + '\n',
    )
  })
}

function pgrep(lab: LabContext) {
  return defineCommand('pgrep', async (args) => {
    const full = args.includes('-f')
    const list = args.includes('-l') || args.includes('-a')
    const pattern = args.filter((arg) => !arg.startsWith('-')).pop() ?? ''
    let regex: RegExp
    try {
      regex = new RegExp(pattern)
    } catch {
      return fail(2, `pgrep: invalid pattern\n`)
    }
    const matches = lab.world.processes.filter((proc) =>
      regex.test(full ? proc.command : (proc.command.split(' ')[0].split('/').pop() ?? '')),
    )
    if (matches.length === 0) return fail(1, '')
    return ok(
      matches
        .map((proc) =>
          list
            ? `${proc.pid} ${full || args.includes('-a') ? proc.command : proc.command.split(' ')[0].split('/').pop()}`
            : String(proc.pid),
        )
        .join('\n') + '\n',
    )
  })
}

function pidof(lab: LabContext) {
  return defineCommand('pidof', async (args) => {
    const name = args.filter((arg) => !arg.startsWith('-'))[0] ?? ''
    const pids = lab.world.processes
      .filter(
        (proc) => (proc.command.split(' ')[0].split('/').pop() ?? '').replace(/:$/, '') === name,
      )
      .map((proc) => proc.pid)
    return pids.length ? ok(`${pids.join(' ')}\n`) : fail(1, '')
  })
}

function killProcess(lab: LabContext, pid: number) {
  const index = lab.world.processes.findIndex((proc) => proc.pid === pid)
  if (index < 0) return false
  const [proc] = lab.world.processes.splice(index, 1)
  if (proc.service && lab.world.services[proc.service])
    lab.world.services[proc.service].state = 'failed'
  return true
}

function kill(lab: LabContext) {
  return defineCommand('kill', async (args) => {
    const pids = args.filter((arg) => /^\d+$/.test(arg)).map(Number)
    if (pids.length === 0)
      return fail(2, 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ...\n')
    const errors = pids
      .filter((pid) => !killProcess(lab, pid))
      .map((pid) => `bash: kill: (${pid}) - No such process\n`)
    return errors.length ? fail(1, errors.join('')) : ok()
  })
}

function pkill(lab: LabContext, name: string) {
  return defineCommand(name, async (args) => {
    const full = args.includes('-f')
    const pattern = args.filter((arg) => !arg.startsWith('-')).pop() ?? ''
    const matches = lab.world.processes.filter((proc) =>
      name === 'killall'
        ? (proc.command.split(' ')[0].split('/').pop() ?? '') === pattern
        : new RegExp(pattern).test(
            full ? proc.command : (proc.command.split(' ')[0].split('/').pop() ?? ''),
          ),
    )
    for (const proc of matches) killProcess(lab, proc.pid)
    return matches.length
      ? ok()
      : fail(1, name === 'killall' ? `${pattern}: no process found\n` : '')
  })
}

function fuser(lab: LabContext) {
  return defineCommand('fuser', async (args) => {
    const target = args.filter((arg) => !arg.startsWith('-')).pop() ?? ''
    const port = /^(\d+)\/tcp$/.exec(target)?.[1]
    const procs = port
      ? lab.world.processes.filter((proc) => proc.port === Number(port))
      : lab.world.processes.filter((proc) => proc.openFiles?.includes(target))
    if (procs.length === 0) return fail(1, '')
    if (args.includes('-k')) for (const proc of procs) killProcess(lab, proc.pid)
    return ok(` ${procs.map((proc) => proc.pid).join(' ')}\n`, `${target}:`)
  })
}

function systemctl(lab: LabContext) {
  return defineCommand('systemctl', async (args) => {
    const positional = args.filter((arg) => !arg.startsWith('-'))
    const [action, rawUnit] = positional
    const unit = rawUnit?.replace(/\.service$/, '')
    const quiet = args.includes('--quiet') || args.includes('-q')
    const services = lab.world.services
    if (
      args.includes('--failed') ||
      (action === 'list-units' && args.some((arg) => arg.includes('failed')))
    ) {
      const failed = Object.entries(services).filter(([, service]) => service.state === 'failed')
      return ok(
        `  UNIT${' '.repeat(16)}LOAD   ACTIVE SUB    DESCRIPTION\n${failed.map(([name]) => `● ${pad(`${name}.service`, 20, true)}loaded failed failed ${name}`).join('\n')}\n\n${failed.length} loaded units listed.\n`,
      )
    }
    if (!action) return fail(1, 'systemctl: missing command\n')
    if (!unit) return fail(1, `Too few arguments.\n`)
    const service = services[unit]
    switch (action) {
      case 'is-active':
        return {
          stdout: quiet ? '' : `${service ? service.state : 'inactive'}\n`,
          stderr: '',
          exitCode: service?.state === 'active' ? 0 : 3,
        }
      case 'is-failed':
        return {
          stdout: quiet ? '' : `${service ? service.state : 'inactive'}\n`,
          stderr: '',
          exitCode: service?.state === 'failed' ? 0 : 1,
        }
      case 'is-enabled':
        return service
          ? ok('enabled\n')
          : fail(
              1,
              `Failed to get unit file state for ${unit}.service: No such file or directory\n`,
            )
      case 'status': {
        if (!service) return fail(4, `Unit ${unit}.service could not be found.\n`)
        const since = (ago: number) => {
          const at = lab.world.now - ago
          return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(at).getDay()]} ${localDay(at)} ${localClock(at)}`
        }
        const active =
          service.state === 'active'
            ? `active (running) since ${since(DAY + 3_600_000)}; 1 day ago`
            : service.state === 'failed'
              ? `failed (Result: exit-code) since ${since(2 * 3_600_000)}; 2h ago`
              : 'inactive (dead)'
        return {
          stdout: `${service.state === 'active' ? '●' : '○'} ${unit}.service - ${unit}\n     Loaded: loaded (/lib/systemd/system/${unit}.service; enabled; preset: enabled)\n     Active: ${active}\n`,
          stderr: '',
          exitCode: service.state === 'active' ? 0 : 3,
        }
      }
      case 'start':
      case 'restart':
      case 'reload': {
        if (!service)
          return fail(5, `Failed to ${action} ${unit}.service: Unit ${unit}.service not found.\n`)
        if (!service.restartWorks) {
          service.state = 'failed'
          return fail(
            1,
            `Job for ${unit}.service failed because the control process exited with error code.\nSee "systemctl status ${unit}.service" and "journalctl -xeu ${unit}.service" for details.\n`,
          )
        }
        service.state = 'active'
        if (!lab.world.processes.some((proc) => proc.service === unit)) {
          lab.world.processes.push({
            pid: 9000 + Object.keys(services).indexOf(unit),
            user: 'root',
            cpu: 0.1,
            mem: 0.3,
            rssKb: 20_000,
            command:
              unit === 'nginx' ? 'nginx: master process /usr/sbin/nginx' : `/usr/bin/${unit}`,
            service: unit,
            ...(unit === 'nginx' ? { port: 80 } : {}),
          })
        }
        return ok()
      }
      case 'stop': {
        if (!service)
          return fail(5, `Failed to stop ${unit}.service: Unit ${unit}.service not loaded.\n`)
        service.state = 'inactive'
        lab.world.processes = lab.world.processes.filter((proc) => proc.service !== unit)
        return ok()
      }
      case 'enable':
      case 'disable':
        return service
          ? ok('', `Created symlink /etc/systemd/system/multi-user.target.wants/${unit}.service.\n`)
          : fail(1, `Failed to ${action} unit: Unit file ${unit}.service does not exist.\n`)
      default:
        return fail(1, `(lab) systemctl ${action} is not simulated\n`)
    }
  })
}

function service(lab: LabContext, systemctlCommand: ReturnType<typeof systemctl>) {
  return defineCommand('service', async (args, ctx) => {
    const [name, action] = args
    if (!name || !action)
      return fail(
        1,
        'Usage: service < option > | --status-all | [ service_name [ command | --full-restart ] ]\n',
      )
    void lab
    return systemctlCommand.execute([action === 'status' ? 'status' : action, name], ctx)
  })
}

function ss(lab: LabContext) {
  return defineCommand('ss', async (args) => {
    const flags = args.join('')
    const listening = lab.world.processes.filter((proc) => proc.port !== undefined)
    const showProcess = flags.includes('p')
    const header = `State  Recv-Q Send-Q Local Address:Port  Peer Address:Port${showProcess ? 'Process' : ''}`
    const rows = listening.map((proc) => {
      const local = `${proc.port === 22 || proc.port === 443 || proc.port === 80 ? '0.0.0.0' : proc.port === 6379 || proc.port === 5432 ? '127.0.0.1' : '*'}:${proc.port}`
      const name = (proc.command.split(' ')[0].split('/').pop() ?? '').replace(/:$/, '')
      return `LISTEN 0      511    ${pad(local, 19, true)}0.0.0.0:*        ${showProcess ? `users:(("${name}",pid=${proc.pid},fd=6))` : ''}`
    })
    return ok([header, ...rows].join('\n') + '\n')
  })
}

function lsof(lab: LabContext) {
  return defineCommand('lsof', async (args) => {
    const terse = args.includes('-t')
    const portArg = args.join(' ').match(/-i\s*(?:tcp)?:?(\d+)/i)?.[1]
    const pidArg = args.includes('-p') ? Number(args[args.indexOf('-p') + 1]) : undefined
    const files = args.filter((arg) => arg.startsWith('/'))
    const rows: string[] = []
    const pids = new Set<number>()
    for (const proc of lab.world.processes) {
      const name = (proc.command.split(' ')[0].split('/').pop() ?? '').replace(/:$/, '').slice(0, 9)
      if (portArg && proc.port === Number(portArg)) {
        rows.push(
          `${pad(name, 9, true)} ${pad(proc.pid, 5)} ${pad(proc.user, 8, true)}   6u  IPv4  31337      0t0  TCP *:${proc.port} (LISTEN)`,
        )
        pids.add(proc.pid)
      }
      for (const file of proc.openFiles ?? []) {
        const wanted = files.length
          ? files.includes(file)
          : pidArg === proc.pid ||
            (!portArg &&
              pidArg === undefined &&
              args.filter((arg) => !arg.startsWith('-')).length === 0)
        if (wanted) {
          const size = lab.fs.sizes.get(file) ?? 0
          rows.push(
            `${pad(name, 9, true)} ${pad(proc.pid, 5)} ${pad(proc.user, 8, true)}   3w   REG  253,1 ${pad(size, 10)} 131074 ${file}`,
          )
          pids.add(proc.pid)
        }
      }
    }
    if (rows.length === 0) return fail(1, '')
    if (terse) return ok([...pids].join('\n') + '\n')
    return ok(
      ['COMMAND     PID USER       FD   TYPE DEVICE   SIZE/OFF   NODE NAME', ...rows].join('\n') +
        '\n',
    )
  })
}

function free(lab: LabContext) {
  return defineCommand('free', async (args) => {
    const { totalMb, usedMb, buffMb, swapTotalMb, swapUsedMb } = lab.world.memory
    const freeMb = totalMb - usedMb - buffMb
    const availableMb = freeMb + buffMb
    const unit =
      args.includes('-m') || args.includes('--mega')
        ? 'm'
        : args.includes('-g')
          ? 'g'
          : args.includes('-h')
            ? 'h'
            : 'k'
    const show = (mb: number) => {
      if (unit === 'm') return String(mb)
      if (unit === 'g') return String(Math.round(mb / 1024))
      if (unit === 'h') return mb >= 1024 ? `${(mb / 1024).toFixed(1)}Gi` : `${mb}Mi`
      return String(mb * 1024)
    }
    const row = (label: string, values: number[]) =>
      `${pad(label, 5, true)}${values.map((value) => pad(show(value), 12)).join('')}`
    return ok(
      [
        '               total        used        free      shared  buff/cache   available',
        row('Mem:', [totalMb, usedMb, freeMb, 64, buffMb, availableMb]),
        row('Swap:', [swapTotalMb, swapUsedMb, swapTotalMb - swapUsedMb]),
      ].join('\n') + '\n',
    )
  })
}

function uptimeText(world: World) {
  const time = localClock(world.now)
  return ` ${time} up ${world.uptimeDays} days,  3:04,  2 users,  load average: ${world.load.map((value) => value.toFixed(2)).join(', ')}`
}

function uptime(lab: LabContext) {
  return defineCommand('uptime', async (args) =>
    ok(
      args.includes('-p')
        ? `up ${lab.world.uptimeDays} days, 3 hours, 4 minutes\n`
        : `${uptimeText(lab.world)}\n`,
    ),
  )
}

function top(lab: LabContext) {
  return defineCommand('top', async (args) => {
    if (!args.some((arg) => arg.includes('b')))
      return fail(1, "(lab) interactive top isn't simulated - use top -bn1\n")
    const { memory, processes } = lab.world
    const cpuUsed = Math.min(
      99.9,
      processes.reduce((sum, proc) => sum + proc.cpu, 0) / lab.world.cpus,
    )
    const header = [
      `top -${uptimeText(lab.world).replace(/^ \S+/, ` ${localClock(lab.world.now)}`)}`,
      `Tasks: ${processes.length + 180} total,   2 running, ${processes.length + 178} sleeping,   0 stopped,   0 zombie`,
      `%Cpu(s): ${cpuUsed.toFixed(1)} us,  2.1 sy,  0.0 ni, ${(100 - cpuUsed - 2.1).toFixed(1)} id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st`,
      `MiB Mem :   ${memory.totalMb.toFixed(1)} total,    ${(memory.totalMb - memory.usedMb - memory.buffMb).toFixed(1)} free,   ${memory.usedMb.toFixed(1)} used,    ${memory.buffMb.toFixed(1)} buff/cache`,
      `MiB Swap:   ${memory.swapTotalMb.toFixed(1)} total,   ${(memory.swapTotalMb - memory.swapUsedMb).toFixed(1)} free,    ${memory.swapUsedMb.toFixed(1)} used.`,
      '',
      '    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND',
    ]
    const sorted = [...processes].sort((a, b) => b.cpu - a.cpu)
    const rows = sorted.map(
      (proc) =>
        `${pad(proc.pid, 7)} ${pad(proc.user, 9, true)} 20   0 ${pad(proc.rssKb * 2, 7)} ${pad(proc.rssKb, 6)}   8192 S ${pad(proc.cpu.toFixed(1), 5)} ${pad(proc.mem.toFixed(1), 5)}   1:02.33 ${(proc.command.split(' ')[0].split('/').pop() ?? '').replace(/:$/, '')}`,
    )
    return ok([...header, ...rows].join('\n') + '\n')
  })
}

function df(lab: LabContext) {
  return defineCommand('df', async (args) => {
    const human_ = args.some((arg) => /^-[a-zA-Z]*h/.test(arg))
    const output = args.find((arg) => arg.startsWith('--output='))?.slice('--output='.length)
    const paths = args.filter((arg) => !arg.startsWith('-'))
    let mounts = [...lab.world.mounts]
    const all = [...mounts, { fs: 'tmpfs', sizeKb: 4_000_000, usedKb: 0, mount: '/dev/shm' }]
    if (paths.length) {
      mounts = paths.map(
        (path) =>
          [...lab.world.mounts]
            .sort((a, b) => b.mount.length - a.mount.length)
            .find(
              (mount) =>
                path === mount.mount ||
                path.startsWith(mount.mount === '/' ? '/' : `${mount.mount}/`),
            ) ?? lab.world.mounts[0],
      )
    } else mounts = all
    const size = (kb: number) => (human_ ? human(kb * 1024) : String(kb))
    const pct = (mount: (typeof mounts)[number]) =>
      `${mount.sizeKb ? Math.ceil((mount.usedKb / mount.sizeKb) * 100) : 0}%`
    if (output) {
      const fields = output.split(',')
      const names: Record<string, string> = {
        source: 'Filesystem',
        size: 'Size',
        used: 'Used',
        avail: 'Avail',
        pcent: 'Use%',
        target: 'Mounted on',
      }
      const value = (mount: (typeof mounts)[number], field: string) =>
        field === 'source'
          ? mount.fs
          : field === 'size'
            ? size(mount.sizeKb)
            : field === 'used'
              ? size(mount.usedKb)
              : field === 'avail'
                ? size(mount.sizeKb - mount.usedKb)
                : field === 'pcent'
                  ? pct(mount)
                  : mount.mount
      return ok(
        [
          fields.map((field) => names[field] ?? field).join(' '),
          ...mounts.map((mount) =>
            fields.map((field) => pad(value(mount, field), field === 'pcent' ? 4 : 0)).join(' '),
          ),
        ].join('\n') + '\n',
      )
    }
    const head = human_
      ? 'Filesystem      Size  Used Avail Use% Mounted on'
      : 'Filesystem     1K-blocks      Used Available Use% Mounted on'
    const rows = mounts.map((mount) =>
      human_
        ? `${pad(mount.fs, 15, true)}${pad(size(mount.sizeKb), 5)} ${pad(size(mount.usedKb), 5)} ${pad(size(mount.sizeKb - mount.usedKb), 5)} ${pad(pct(mount), 4)} ${mount.mount}`
        : `${pad(mount.fs, 14, true)}${pad(mount.sizeKb, 10)} ${pad(mount.usedKb, 9)} ${pad(mount.sizeKb - mount.usedKb, 9)} ${pad(pct(mount), 4)} ${mount.mount}`,
    )
    return ok([head, ...rows].join('\n') + '\n')
  })
}

function du(lab: LabContext) {
  return defineCommand('du', async (args, ctx) => {
    const flags = args.filter((arg) => arg.startsWith('-'))
    const short = flags.filter((flag) => !flag.startsWith('--')).join('')
    const summarize = short.includes('s')
    const humanReadable = short.includes('h')
    const all = short.includes('a')
    const total = short.includes('c')
    const depthFlag = args.find((arg) => arg.startsWith('--max-depth='))
    const dIndex = args.indexOf('-d')
    const maxDepth = depthFlag
      ? Number(depthFlag.split('=')[1])
      : dIndex >= 0
        ? Number(args[dIndex + 1])
        : summarize
          ? 0
          : Infinity
    const unit = short.includes('m') ? 1024 * 1024 : short.includes('b') ? 1 : 1024
    const paths = args.filter((arg, i) => !arg.startsWith('-') && args[i - 1] !== '-d')
    const show = (bytes: number) => (humanReadable ? human(bytes) : String(Math.ceil(bytes / unit)))
    const out: string[] = []
    const errors: string[] = []
    let grand = 0
    const walk = async (path: string, depth: number): Promise<number> => {
      const stat = await lab.fs.stat(path)
      if (!stat.isDirectory) {
        const size = Math.ceil(stat.size / 4096) * 4096
        if (depth === 0 || (all && depth <= maxDepth)) out.push(`${show(size)}\t${path}`)
        return size
      }
      let sum = 4096
      for (const name of await lab.fs.readdir(path))
        sum += await walk(`${path === '/' ? '' : path}/${name}`, depth + 1)
      if (depth <= maxDepth) out.push(`${show(sum)}\t${path}`)
      return sum
    }
    for (const raw of paths.length ? paths : ['.']) {
      const path =
        raw === '.'
          ? ctx.cwd
          : raw.startsWith('/')
            ? raw.replace(/\/+$/, '') || '/'
            : `${ctx.cwd}/${raw}`
      try {
        const size = await walk(path, 0)
        grand += size
        // Show the path the way it was typed.
        if (raw !== path) out[out.length - 1] = out[out.length - 1].replace(`\t${path}`, `\t${raw}`)
      } catch {
        errors.push(`du: cannot access '${raw}': No such file or directory\n`)
      }
    }
    if (total) out.push(`${show(grand)}\ttotal`)
    return {
      stdout: out.length ? out.join('\n') + '\n' : '',
      stderr: errors.join(''),
      exitCode: errors.length ? 1 : 0,
    }
  })
}

function id(lab: LabContext) {
  return defineCommand('id', async (args) => {
    const name = args.filter((arg) => !arg.startsWith('-'))[0] ?? 'root'
    const row = lines(await lab.fs.readFile('/etc/passwd').catch(() => '')).find(
      (line) => line.split(':')[0] === name,
    )
    if (!row) return fail(1, `id: '${name}': no such user\n`)
    const [user, , uid, gid] = row.split(':')
    if (args.includes('-u')) return ok(`${uid}\n`)
    return ok(`uid=${uid}(${user}) gid=${gid}(${user}) groups=${gid}(${user})\n`)
  })
}

function useradd(lab: LabContext, name: string) {
  return defineCommand(name, async (args) => {
    const user = args
      .filter(
        (arg, i) =>
          !arg.startsWith('-') && !['-s', '-d', '-g', '-G', '-c', '-u'].includes(args[i - 1]),
      )
      .pop()
    if (!user) return fail(2, `${name}: missing user name\n`)
    const text = await lab.fs.readFile('/etc/passwd')
    if (lines(text).some((line) => line.split(':')[0] === user))
      return fail(9, `${name}: user '${user}' already exists\n`)
    const shell = args.includes('-s') ? args[args.indexOf('-s') + 1] : '/bin/sh'
    await lab.fs.writeFile('/etc/passwd', `${text}${user}:x:1100:1100::/home/${user}:${shell}\n`)
    return ok()
  })
}

function crontab(lab: LabContext) {
  const path = '/var/spool/cron/crontabs/root'
  return defineCommand('crontab', async (args, ctx) => {
    if (args.includes('-l')) {
      const text = await lab.fs.readFile(path).catch(() => '')
      return text ? ok(text) : fail(1, 'no crontab for root\n')
    }
    if (args.includes('-r')) {
      await lab.fs.writeFile(path, '')
      return ok()
    }
    if (args.includes('-e'))
      return fail(
        1,
        "(lab) no editor here - write the lines to a file and run: crontab file, or: (crontab -l; echo '0 2 * * * /path/script.sh') | crontab -\n",
      )
    const source = args.filter((arg) => !arg.startsWith('-') || arg === '-').pop()
    if (!source) return fail(1, 'usage: crontab [-l | -r | file]\n')
    const text =
      source === '-'
        ? stdinText(ctx)
        : await lab.fs
            .readFile(source.startsWith('/') ? source : `${ctx.cwd}/${source}`)
            .catch(() => null)
    if (text === null) return fail(1, `crontab: can't open '${source}'\n`)
    for (const line of lines(text)) {
      if (line.trim().startsWith('#') || /^\s*\w+=/.test(line)) continue
      if (!/^\s*(@\w+|(\S+\s+){4}\S+)\s+\S/.test(line))
        return fail(
          1,
          `"-":${lines(text).indexOf(line) + 1}: bad minute\nerrors in crontab file, can't install.\n`,
        )
    }
    await lab.fs.writeFile(path, text.endsWith('\n') ? text : `${text}\n`)
    return ok()
  })
}

/* ---------- containers and cloud ---------- */

function docker(lab: LabContext) {
  return defineCommand('docker', async (args) => {
    let [sub, ...rest] = args
    if (sub === 'image' && rest[0] === 'ls') [sub, ...rest] = ['images', ...rest.slice(1)]
    if (sub === 'image' && rest[0] === 'prune') [sub, ...rest] = ['image-prune', ...rest.slice(1)]
    if (sub === 'image' && rest[0] === 'rm') [sub, ...rest] = ['rmi', ...rest.slice(1)]
    const images = lab.world.images
    const created = (image: (typeof images)[number]) =>
      image.ageDays === 0
        ? 'About an hour ago'
        : image.ageDays < 14
          ? `${image.ageDays} days ago`
          : `${Math.floor(image.ageDays / 7)} weeks ago`
    const createdAt = (image: (typeof images)[number]) =>
      new Date(lab.world.now - image.ageDays * DAY).toISOString().replace('T', ' ').slice(0, 19) +
      ' +0000 UTC'
    switch (sub) {
      case 'images': {
        const filters = rest.flatMap((arg, i) =>
          arg === '-f' || arg === '--filter'
            ? [rest[i + 1]]
            : arg.startsWith('--filter=')
              ? [arg.slice(9)]
              : [],
        )
        let list = [...images]
        if (filters.includes('dangling=true'))
          list = list.filter((image) => image.repository === '<none>')
        if (filters.includes('dangling=false'))
          list = list.filter((image) => image.repository !== '<none>')
        const reference = rest.find(
          (arg) =>
            !arg.startsWith('-') &&
            !filters.includes(arg) &&
            !rest[rest.indexOf(arg) - 1]?.startsWith('--format'),
        )
        if (reference)
          list = list.filter(
            (image) =>
              image.repository === reference.split(':')[0] &&
              (!reference.includes(':') || image.tag === reference.split(':')[1]),
          )
        if (rest.includes('-q') || rest.includes('--quiet'))
          return ok(list.map((image) => image.id).join('\n') + (list.length ? '\n' : ''))
        const formatIndex = rest.findIndex(
          (arg) => arg === '--format' || arg.startsWith('--format='),
        )
        if (formatIndex >= 0) {
          const template = rest[formatIndex].startsWith('--format=')
            ? rest[formatIndex].slice(9)
            : rest[formatIndex + 1]
          return ok(
            list
              .map((image) =>
                template
                  .replace(/\{\{\s*\.Repository\s*\}\}/g, image.repository)
                  .replace(/\{\{\s*\.Tag\s*\}\}/g, image.tag)
                  .replace(/\{\{\s*\.ID\s*\}\}/g, image.id)
                  .replace(/\{\{\s*\.CreatedSince\s*\}\}/g, created(image))
                  .replace(/\{\{\s*\.CreatedAt\s*\}\}/g, createdAt(image))
                  .replace(/\{\{\s*\.Size\s*\}\}/g, `${image.sizeMb}MB`)
                  .replace(/\\t/g, '\t'),
              )
              .join('\n') + (list.length ? '\n' : ''),
          )
        }
        return ok(
          [
            'REPOSITORY   TAG       IMAGE ID       CREATED        SIZE',
            ...list.map(
              (image) =>
                `${pad(image.repository, 12, true)} ${pad(image.tag, 9, true)} ${image.id}   ${pad(created(image), 14, true)} ${image.sizeMb}MB`,
            ),
          ].join('\n') + '\n',
        )
      }
      case 'image-prune':
      case 'system': {
        if (sub === 'system' && rest[0] === 'df') {
          const total = images.reduce((sum, image) => sum + image.sizeMb, 0)
          const reclaim = images
            .filter((image) => !image.inUse)
            .reduce((sum, image) => sum + image.sizeMb, 0)
          return ok(
            `TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE\nImages          ${images.length}         ${images.filter((image) => image.inUse).length}         ${(total / 1024).toFixed(2)}GB    ${(reclaim / 1024).toFixed(2)}GB (${Math.round((reclaim / total) * 100)}%)\nContainers      ${images.filter((image) => image.inUse).length}         ${images.filter((image) => image.inUse).length}         2.1MB     0B (0%)\n`,
          )
        }
        if (sub === 'system' && rest[0] !== 'prune')
          return fail(1, `(lab) docker system ${rest[0] ?? ''} is not simulated\n`)
        const options = sub === 'system' ? rest.slice(1) : rest
        if (!options.includes('-f') && !options.includes('--force'))
          return fail(
            1,
            'WARNING! This will remove all dangling images.\n(lab) No terminal for the "Are you sure?" prompt - add -f\n',
          )
        const untilArg = options
          .flatMap((arg, i) =>
            arg === '--filter' || arg === '-f'
              ? [options[i + 1]]
              : arg.startsWith('--filter=')
                ? [arg.slice(9)]
                : [],
          )
          .find((value) => value?.startsWith('until='))
        const hours = untilArg ? Number(/until=(\d+)h/.exec(untilArg)?.[1] ?? 0) : 0
        const removeAll = options.includes('-a') || options.includes('--all')
        const removed = images.filter(
          (image) =>
            !image.inUse &&
            (removeAll || image.repository === '<none>') &&
            (!hours || image.ageDays * 24 >= hours),
        )
        lab.world.images = images.filter((image) => !removed.includes(image))
        const reclaimed = removed.reduce((sum, image) => sum + image.sizeMb, 0)
        return ok(
          `${removed.length ? `Deleted Images:\n${removed.map((image) => `${image.repository === '<none>' ? '' : `untagged: ${image.repository}:${image.tag}\n`}deleted: sha256:${image.id}${'0'.repeat(52)}`).join('\n')}\n\n` : ''}Total reclaimed space: ${reclaimed}MB\n`,
        )
      }
      case 'rmi': {
        const force = rest.includes('-f') || rest.includes('--force')
        const refs = rest.filter((arg) => !arg.startsWith('-'))
        if (refs.length === 0) return fail(1, '"docker rmi" requires at least 1 argument.\n')
        const out: string[] = []
        const errors: string[] = []
        for (const ref of refs) {
          const image = images.find(
            (entry) =>
              entry.id.startsWith(ref) ||
              `${entry.repository}:${entry.tag}` === ref ||
              (entry.repository === ref && entry.tag === 'latest'),
          )
          if (!image) {
            errors.push(`Error response from daemon: No such image: ${ref}`)
            continue
          }
          if (image.inUse && !force) {
            errors.push(
              `Error response from daemon: conflict: unable to delete ${image.id} (cannot be forced) - image is being used by running container 3f2a9c1d7e44`,
            )
            continue
          }
          lab.world.images = lab.world.images.filter((entry) => entry !== image)
          if (image.repository !== '<none>') out.push(`Untagged: ${image.repository}:${image.tag}`)
          out.push(`Deleted: sha256:${image.id}${'0'.repeat(52)}`)
        }
        return {
          stdout: out.length ? out.join('\n') + '\n' : '',
          stderr: errors.length ? errors.join('\n') + '\n' : '',
          exitCode: errors.length ? 1 : 0,
        }
      }
      case 'ps': {
        const running = images.filter((image) => image.inUse)
        if (rest.includes('-q'))
          return ok(running.map((_, i) => `3f2a9c1d7e4${i}`).join('\n') + '\n')
        return ok(
          [
            'CONTAINER ID   IMAGE              STATUS       NAMES',
            ...running.map(
              (image, i) =>
                `3f2a9c1d7e4${i}   ${pad(`${image.repository}:${image.tag}`, 18, true)} Up 2 days    ${image.repository.split('/').pop()}-${i + 1}`,
            ),
          ].join('\n') + '\n',
        )
      }
      case 'version':
      case '--version':
        return ok('Docker version 27.3.1, build ce12230\n')
      default:
        return fail(
          1,
          `(lab) docker ${sub ?? ''} is not simulated - try images, image prune, rmi, ps, system df\n`,
        )
    }
  })
}

function kubectl(lab: LabContext) {
  return defineCommand('kubectl', async (args) => {
    const namespace = (() => {
      const index = args.findIndex((arg) => arg === '-n' || arg === '--namespace')
      if (index >= 0) return args[index + 1]
      return args.find((arg) => arg.startsWith('--namespace='))?.slice(12)
    })()
    const positional = args.filter(
      (arg, i) =>
        !arg.startsWith('-') && !['-n', '--namespace', '--timeout', '-o'].includes(args[i - 1]),
    )
    const [verb, sub, target] = positional
    const deployments = lab.world.deployments
    const findDeployment = (ref: string | undefined) => {
      const name = ref?.replace(/^(deployment|deploy|deployments)(\.apps)?\//, '')
      return deployments.find(
        (entry) => entry.name === name && (!namespace || entry.namespace === namespace),
      )
    }
    if (verb === 'rollout' && sub === 'status') {
      const ref = target ?? positional[3]
      const name = ref?.replace(/^(deployment|deploy|deployments)(\.apps)?\//, '') ?? ''
      const deployment = findDeployment(ref)
      if (!deployment)
        return fail(1, `Error from server (NotFound): deployments.apps "${name}" not found\n`)
      const timeout = args.find((arg) => arg.startsWith('--timeout'))
      if (deployment.healthy) {
        return ok(
          `Waiting for deployment "${name}" rollout to finish: ${deployment.replicas - 1} of ${deployment.replicas} updated replicas are available...\ndeployment "${name}" successfully rolled out\n`,
        )
      }
      return fail(
        1,
        timeout
          ? 'error: timed out waiting for the condition\n'
          : `error: deployment "${name}" exceeded its progress deadline\n`,
        `Waiting for deployment "${name}" rollout to finish: 1 out of ${deployment.replicas} new replicas have been updated...\n`,
      )
    }
    if (verb === 'rollout' && sub === 'undo') {
      const deployment = findDeployment(target)
      if (!deployment)
        return fail(1, `Error from server (NotFound): deployments.apps "${target}" not found\n`)
      deployment.healthy = true
      return ok(`deployment.apps/${deployment.name} rolled back\n`)
    }
    if (verb === 'get' && ['deploy', 'deployment', 'deployments'].includes(sub ?? '')) {
      const list = deployments.filter(
        (entry) => args.includes('-A') || !namespace || entry.namespace === namespace,
      )
      return ok(
        [
          'NAME     READY   UP-TO-DATE   AVAILABLE   AGE',
          ...list.map(
            (entry) =>
              `${pad(entry.name, 8, true)} ${entry.healthy ? entry.replicas : entry.replicas - 1}/${entry.replicas}     ${entry.replicas}            ${entry.healthy ? entry.replicas : entry.replicas - 1}           12d`,
          ),
        ].join('\n') + '\n',
      )
    }
    if (verb === 'get' && ['pods', 'pod', 'po'].includes(sub ?? '')) {
      const rows = deployments.flatMap((entry) =>
        Array.from(
          { length: entry.replicas },
          (_, i) =>
            `${pad(`${entry.name}-7d9f8c-${'abcde'[i] ?? 'x'}${i}x2`, 20, true)} ${!entry.healthy && i === 0 ? '0/1     CrashLoopBackOff   7' : '1/1     Running            0'}          3h`,
        ),
      )
      return ok(
        ['NAME                 READY   STATUS             RESTARTS   AGE', ...rows].join('\n') +
          '\n',
      )
    }
    if (verb === 'version') return ok('Client Version: v1.31.2\nServer Version: v1.31.1\n')
    return fail(
      1,
      `(lab) kubectl ${positional.join(' ')} is not simulated - try rollout status, get deploy, get pods\n`,
    )
  })
}

function az(lab: LabContext) {
  return defineCommand('az', async (args) => {
    const query = (() => {
      const index = args.indexOf('--query')
      return index >= 0 ? args[index + 1] : undefined
    })()
    const output = (() => {
      const index = args.findIndex((arg) => arg === '-o' || arg === '--output')
      return index >= 0 ? args[index + 1] : 'json'
    })()
    const positional = args.filter(
      (arg, i) =>
        !arg.startsWith('-') &&
        !['--query', '-o', '--output', '-g', '--resource-group', '--resource-type'].includes(
          args[i - 1],
        ),
    )
    const group = (() => {
      const index = args.findIndex((arg) => arg === '-g' || arg === '--resource-group')
      return index >= 0 ? args[index + 1] : undefined
    })()
    let data: unknown
    const command = positional.slice(0, 2).join(' ')
    if (command === 'resource list') {
      data = lab.world.resources
        .filter((resource) => !group || resource.resourceGroup === group)
        .map((resource) => ({
          id: `/subscriptions/0000/resourceGroups/${resource.resourceGroup}/providers/${resource.type}/${resource.name}`,
          name: resource.name,
          type: resource.type,
          resourceGroup: resource.resourceGroup,
          location: resource.location,
          tags: resource.tags,
        }))
    } else if (command === 'group list') {
      data = [
        ...new Set(
          lab.world.resources.map((resource) => `${resource.resourceGroup}|${resource.location}`),
        ),
      ].map((entry) => {
        const [name, location] = entry.split('|')
        return { name, location, properties: { provisioningState: 'Succeeded' } }
      })
    } else if (command === 'account show') {
      data = {
        name: 'Lab Subscription',
        id: '00000000-0000-0000-0000-000000000000',
        state: 'Enabled',
        user: { name: 'root@lab' },
      }
    } else if (command === 'vm list') {
      data = lab.world.resources
        .filter((resource) => resource.type.endsWith('virtualMachines'))
        .map((resource) => ({
          name: resource.name,
          resourceGroup: resource.resourceGroup,
          location: resource.location,
          powerState: 'VM running',
          tags: resource.tags,
        }))
    } else {
      return fail(
        2,
        `(lab) az ${positional.join(' ')} is not simulated - try az resource list, az group list, az vm list\n`,
      )
    }
    if (query) {
      try {
        data = jmespath.search(data, query)
      } catch (error) {
        return fail(
          2,
          `ERROR: argument --query: invalid jmespath_type value: '${query}' (${(error as Error).message})\n`,
        )
      }
    }
    if (output === 'tsv') {
      const rowOf = (value: unknown): string =>
        value === null || value === undefined
          ? ''
          : typeof value === 'object' && !Array.isArray(value)
            ? Object.values(value as object)
                .map((cell) =>
                  typeof cell === 'object' ? JSON.stringify(cell) : String(cell ?? ''),
                )
                .join('\t')
            : Array.isArray(value)
              ? value.map((cell) => String(cell)).join('\t')
              : String(value)
      const rows = Array.isArray(data) ? data.map(rowOf) : [rowOf(data)]
      return ok(rows.join('\n') + (rows.length ? '\n' : ''))
    }
    if (output === 'table') {
      const list = (Array.isArray(data) ? data : [data]).filter(
        (entry) => typeof entry === 'object' && entry,
      ) as Record<string, unknown>[]
      const keys = list.length
        ? Object.keys(list[0]).filter((key) => typeof list[0][key] !== 'object')
        : []
      const widths = keys.map((key) =>
        Math.max(key.length, ...list.map((row) => String(row[key] ?? '').length)),
      )
      const cap = (key: string) => key.charAt(0).toUpperCase() + key.slice(1)
      return ok(
        [
          keys.map((key, i) => pad(cap(key), widths[i], true)).join('  '),
          keys.map((_, i) => '-'.repeat(widths[i])).join('  '),
          ...list.map((row) =>
            keys.map((key, i) => pad(String(row[key] ?? ''), widths[i], true)).join('  '),
          ),
        ].join('\n') + '\n',
      )
    }
    return ok(JSON.stringify(data, null, 2) + '\n')
  })
}

/* ---------- shims over built-ins ---------- */

/** Parses the date strings scripts commonly use into epoch ms, relative to the lab clock. */
export function parseDate(text: string, now: number): number | null {
  const value = text.trim()
  if (/^@\d+$/.test(value)) return Number(value.slice(1)) * 1000
  if (value === '' || value === 'now' || value === 'today') return now
  if (value === 'yesterday') return now - DAY
  if (value === 'tomorrow') return now + DAY
  const relative = /^([+-]?\d+)\s*(second|minute|hour|day|week|month)s?(\s+ago)?$/i.exec(value)
  if (relative) {
    const units: Record<string, number> = {
      second: 1000,
      minute: 60_000,
      hour: 3_600_000,
      day: DAY,
      week: 7 * DAY,
      month: 30 * DAY,
    }
    const amount = Number(relative[1]) * units[relative[2].toLowerCase()]
    return relative[3] ? now - amount : now + amount
  }
  const opensslLike =
    /^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})(\s+GMT|\s+UTC)?$/.exec(value)
  if (opensslLike) {
    const [, month, day, h, m, s, year] = opensslLike
    return Date.UTC(
      Number(year),
      MONTHS.indexOf(month),
      Number(day),
      Number(h),
      Number(m),
      Number(s),
    )
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value)
  if (iso) {
    const [, y, mo, d, h = '0', mi = '0', s = '0'] = iso
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    ).getTime()
  }
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function dateShim(lab: LabContext) {
  return defineCommand('date', async (args, ctx) => {
    const index = args.findIndex(
      (arg) => arg === '-d' || arg === '--date' || arg.startsWith('--date='),
    )
    let rest = [...args]
    let when = lab.world.now
    if (index >= 0) {
      const text = args[index].startsWith('--date=')
        ? args[index].slice(7)
        : (args[index + 1] ?? '')
      const parsed = parseDate(text, lab.world.now)
      if (parsed === null) return fail(1, `date: invalid date '${text}'\n`)
      when = parsed
      rest = args.filter(
        (_, i) => i !== index && (args[index].startsWith('--date=') || i !== index + 1),
      )
    }
    if (rest.includes('-s') || rest.includes('--set'))
      return fail(1, 'date: cannot set date: Operation not permitted\n')
    return (
      (await ctx.origCommand?.(['-d', `@${Math.floor(when / 1000)}`, ...rest])) ??
      fail(1, 'date: unavailable\n')
    )
  })
}

function statShim(lab: LabContext) {
  return defineCommand('stat', async (args, ctx) => {
    const formatArg = args.findIndex(
      (arg) =>
        arg === '-c' ||
        arg === '--format' ||
        arg.startsWith('--format=') ||
        arg.startsWith('--printf=') ||
        arg === '--printf',
    )
    if (formatArg < 0) return (await ctx.origCommand?.(args)) ?? fail(1, '')
    const raw = args[formatArg]
    const printf = raw.startsWith('--printf')
    const format = raw.includes('=') ? raw.slice(raw.indexOf('=') + 1) : args[formatArg + 1]
    const files = args.filter(
      (_, i) =>
        i !== formatArg && (raw.includes('=') || i !== formatArg + 1) && !args[i].startsWith('-'),
    )
    const out: string[] = []
    for (const file of files) {
      const path = file.startsWith('/') ? file : `${ctx.cwd}/${file}`
      let stat
      try {
        stat = await lab.fs.stat(path)
      } catch {
        return fail(1, `stat: cannot statx '${file}': No such file or directory\n`)
      }
      const mtime = stat.mtime.getTime()
      const text = format
        .replace(/%s/g, String(stat.size))
        .replace(/%Y/g, String(Math.floor(mtime / 1000)))
        .replace(
          /%y/g,
          `${localDay(mtime)} ${localClock(mtime)}.${String(mtime % 1000).padStart(3, '0')}000000 ${offsetText(mtime)}`,
        )
        .replace(/%n/g, file)
        .replace(/%a/g, (stat.mode & 0o777).toString(8))
        .replace(/%U/g, 'root')
        .replace(/%G/g, 'root')
        .replace(
          /%F/g,
          stat.isDirectory ? 'directory' : stat.size === 0 ? 'regular empty file' : 'regular file',
        )
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
      out.push(printf ? text : `${text}\n`)
    }
    return ok(out.join(''))
  })
}

function sedShim(lab: LabContext) {
  return defineCommand('sed', async (args, ctx) => {
    const index = args.findIndex((arg) => /^-i.+/.test(arg) || /^--in-place=.+/.test(arg))
    if (index < 0) return (await ctx.origCommand?.(args)) ?? fail(1, '')
    const suffix = args[index].replace(/^-i|^--in-place=/, '')
    const rest = [...args]
    rest[index] = '-i'
    // Files are the arguments after the script (the first non-option after -i).
    const nonOptions = rest
      .map((arg, i) => ({ arg, i }))
      .filter(({ arg, i }) => !arg.startsWith('-') && rest[i - 1] !== '-e' && rest[i - 1] !== '-f')
    const hasScriptOption = rest.includes('-e') || rest.includes('-f')
    const files = (hasScriptOption ? nonOptions : nonOptions.slice(1)).map(({ arg }) => arg)
    for (const file of files) {
      const path = file.startsWith('/') ? file : `${ctx.cwd}/${file}`
      try {
        await lab.fs.writeFile(`${path}${suffix}`, await lab.fs.readFile(path))
      } catch {
        /* sed reports the missing file */
      }
    }
    return (await ctx.origCommand?.(rest)) ?? fail(1, '')
  })
}

const TIME_TESTS: Record<string, number> = {
  '-mmin': 60_000,
  '-amin': 60_000,
  '-cmin': 60_000,
  '-mtime': DAY,
  '-atime': DAY,
  '-ctime': DAY,
}

function findShim(lab: LabContext) {
  return defineCommand('find', async (args, ctx) => {
    // -mmin isn't built in and -mtime rounds differently from GNU find, so both
    // become -newer tests against reference files of the right age.
    if (!args.some((arg) => arg in TIME_TESTS))
      return (await ctx.origCommand?.(args)) ?? fail(1, '')
    const refs: string[] = []
    const ref = async (age: number) => {
      const path = `/proc/lab/age-${age}`
      await lab.fs.mkdir('/proc/lab', { recursive: true })
      await lab.fs.writeFile(path, '')
      const at = new Date(lab.world.now - age)
      await lab.fs.utimes(path, at, at)
      refs.push(path)
      return path
    }
    const rewritten: string[] = []
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i]
      const unit = TIME_TESTS[arg]
      if (unit === undefined) {
        rewritten.push(arg)
        continue
      }
      const value = args[i + 1] ?? ''
      i += 1
      const n = Math.abs(Number.parseInt(value, 10)) || 0
      // GNU semantics on whole units: +n means age >= n+1 units, -n means age < n, n means n <= age < n+1.
      if (value.startsWith('+')) rewritten.push('!', '-newer', await ref((n + 1) * unit))
      else if (value.startsWith('-')) rewritten.push('-newer', await ref(n * unit))
      else rewritten.push('!', '-newer', await ref(n * unit), '-newer', await ref((n + 1) * unit))
    }
    try {
      return (await ctx.origCommand?.(rewritten)) ?? fail(1, '')
    } finally {
      for (const path of refs) await lab.fs.rm(path, { force: true })
    }
  })
}

function touchShim(lab: LabContext) {
  // touch -d understands the same dates as `date -d` here (e.g. "10 days ago"), on the lab's clock.
  return defineCommand('touch', async (args, ctx) => {
    const index = args.findIndex(
      (arg) => arg === '-d' || arg === '--date' || arg.startsWith('--date=') || arg === '-t',
    )
    if (index < 0) return (await ctx.origCommand?.(args)) ?? fail(1, '')
    const inline = args[index].startsWith('--date=')
    const text = inline ? args[index].slice(7) : (args[index + 1] ?? '')
    let when: number | null
    if (args[index] === '-t') {
      const match = /^(?:(\d{2})?(\d{2}))?(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d{2}))?$/.exec(text)
      const year = match
        ? match[2]
          ? Number(`${match[1] ?? '20'}${match[2]}`)
          : new Date(lab.world.now).getFullYear()
        : 0
      when = match
        ? new Date(
            year,
            Number(match[3]) - 1,
            Number(match[4]),
            Number(match[5]),
            Number(match[6]),
            Number(match[7] ?? 0),
          ).getTime()
        : null
    } else when = parseDate(text, lab.world.now)
    if (when === null) return fail(1, `touch: invalid date format '${text}'\n`)
    const rest = args.filter((_, i) => i !== index && (inline || i !== index + 1))
    const result = (await ctx.origCommand?.(rest)) ?? fail(1, '')
    if (result.exitCode !== 0) return result
    for (const file of rest.filter((arg) => !arg.startsWith('-'))) {
      const path = file.startsWith('/') ? file : `${ctx.cwd}/${file}`
      await lab.fs.utimes(path, new Date(when), new Date(when)).catch(() => undefined)
    }
    return result
  })
}

function gzipShim(lab: LabContext, name: 'gzip' | 'gunzip') {
  return defineCommand(name, async (args, ctx) => {
    // Real gzip keeps the original file's mtime on the .gz (and gunzip restores it).
    const toStdout = args.some((arg) => /^-[a-zA-Z]*c/.test(arg) || arg === '--stdout')
    const decompress =
      name === 'gunzip' || args.some((arg) => /^-[a-zA-Z]*d/.test(arg) || arg === '--decompress')
    const files = args
      .filter((arg) => !arg.startsWith('-'))
      .map((arg) => (arg.startsWith('/') ? arg : `${ctx.cwd}/${arg}`))
    const mtimes = new Map<string, Date>()
    if (!toStdout) {
      for (const file of files) {
        try {
          mtimes.set(file, (await lab.fs.stat(file)).mtime)
        } catch {
          /* gzip reports it */
        }
      }
    }
    const result = (await ctx.origCommand?.(args)) ?? fail(1, '')
    for (const [file, mtime] of mtimes) {
      const output = decompress ? file.replace(/\.gz$/, '') : `${file}.gz`
      try {
        await lab.fs.utimes(output, mtime, mtime)
      } catch {
        /* not produced (e.g. an error) */
      }
    }
    return result
  })
}

function xargs() {
  return defineCommand('xargs', async (args, ctx) => {
    let replace: string | null = null
    let perCommand = Infinity
    let nullSeparated = false
    let noRunIfEmpty = false
    let i = 0
    for (; i < args.length; i += 1) {
      const arg = args[i]
      if (arg === '-I') {
        replace = args[i + 1]
        i += 1
      } else if (arg.startsWith('-I')) replace = arg.slice(2)
      else if (arg === '-i') replace = '{}'
      else if (arg === '-n') {
        perCommand = Number(args[i + 1])
        i += 1
      } else if (/^-n\d+$/.test(arg)) perCommand = Number(arg.slice(2))
      else if (arg === '-0' || arg === '--null') nullSeparated = true
      else if (arg === '-r' || arg === '--no-run-if-empty') noRunIfEmpty = true
      else if (arg === '-t' || arg === '-p') continue
      else break
    }
    const command = args.slice(i).length ? args.slice(i) : ['echo']
    const input = stdinText(ctx)
    const items =
      replace !== null
        ? input.split(nullSeparated ? '\0' : '\n').filter((line) => line.length > 0)
        : input.split(nullSeparated ? /\0/ : /\s+/).filter((item) => item.length > 0)
    if (items.length === 0 && (noRunIfEmpty || replace !== null)) return ok()
    const exec = ctx.exec
    if (!exec) return fail(1, 'xargs: unavailable\n')
    let stdout = ''
    let stderr = ''
    let exitCode = 0
    const runOne = async (words: string[]) => {
      const result = await exec(words.map(shellQuote).join(' '), { cwd: ctx.cwd })
      stdout += result.stdout
      stderr += result.stderr
      if (result.exitCode !== 0) exitCode = 123
    }
    if (replace !== null) {
      const token = replace
      for (const item of items) await runOne(command.map((word) => word.split(token).join(item)))
    } else if (items.length === 0) {
      await runOne(command)
    } else {
      for (
        let start = 0;
        start < items.length;
        start += perCommand === Infinity ? items.length : perCommand
      ) {
        await runOne([
          ...command,
          ...items.slice(start, start + (perCommand === Infinity ? items.length : perCommand)),
        ])
      }
    }
    return { stdout, stderr, exitCode }
  })
}

function zgrep() {
  return defineCommand('zgrep', async (args, ctx) => {
    const files = args.filter((arg) => /\.(gz|log|txt)$/.test(arg) || arg.startsWith('/'))
    const options = args.filter((arg) => !files.includes(arg))
    if (!ctx.exec) return fail(2, 'zgrep: unavailable\n')
    let stdout = ''
    let found = false
    for (const file of files) {
      const reader = file.endsWith('.gz') ? 'zcat' : 'cat'
      const result = await ctx.exec(
        `${reader} ${shellQuote(file)} | grep ${options.map(shellQuote).join(' ')}`,
        { cwd: ctx.cwd },
      )
      if (result.exitCode === 0) found = true
      stdout +=
        files.length > 1 && !options.includes('-h')
          ? result.stdout.replace(/^(?=.)/gm, `${file}:`)
          : result.stdout
    }
    return { stdout, stderr: '', exitCode: found ? 0 : 1 }
  })
}

const UNITS = 'KMGTPE'

/** Parses "900M", "16G", "4.0K", "123" into bytes-ish numbers for sort -h. */
const humanValue = (text: string) => {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*([KMGTPE])?/i.exec(text)
  if (!match) return 0
  return Number(match[1]) * 1024 ** (match[2] ? UNITS.indexOf(match[2].toUpperCase()) + 1 : 0)
}

function sortShim() {
  // just-bash's sort -h ignores the unit (901M sorts above 16G), so -h is done here.
  return defineCommand('sort', async (args, ctx) => {
    const human = args.some(
      (arg) =>
        arg === '--human-numeric-sort' ||
        (/^-[a-zA-Z]+$/.test(arg) && arg.includes('h')) ||
        /^-k\d+(,\d+)?h/.test(arg),
    )
    if (!human) return (await ctx.origCommand?.(args)) ?? fail(1, '')
    let reverse = false
    let unique = false
    let field = 0
    let separator: string | null = null
    const files: string[] = []
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i]
      if (arg === '-k' || /^-k./.test(arg)) {
        const spec = arg === '-k' ? args[++i] : arg.slice(2)
        field = Number.parseInt(spec, 10) || 0
        if (/r/.test(spec.replace(/^[\d,.]+/, ''))) reverse = true
      } else if (arg === '-t') separator = args[++i]
      else if (/^-t./.test(arg)) separator = arg.slice(2)
      else if (arg === '--reverse') reverse = true
      else if (arg === '--unique') unique = true
      else if (/^-[a-zA-Z]+$/.test(arg)) {
        if (arg.includes('r')) reverse = true
        if (arg.includes('u')) unique = true
      } else if (!arg.startsWith('-')) files.push(arg)
    }
    let input = ''
    if (files.length === 0 || files.includes('-')) input += stdinText(ctx)
    for (const file of files.filter((name) => name !== '-')) {
      const result = await ctx.exec?.(`cat ${shellQuote(file)}`, { cwd: ctx.cwd })
      if (!result || result.exitCode !== 0)
        return fail(2, `sort: cannot read: ${file}: No such file or directory\n`)
      input += result.stdout
    }
    const key = (line: string) => {
      if (!field) return humanValue(line)
      const parts = separator === null ? line.trim().split(/\s+/) : line.split(separator)
      return humanValue(parts[field - 1] ?? '')
    }
    const rows = lines(input).map((line) => ({ line, value: key(line) }))
    rows.sort((a, b) => a.value - b.value || (a.line < b.line ? -1 : a.line > b.line ? 1 : 0))
    if (reverse) rows.reverse()
    const out = rows
      .map((row) => row.line)
      .filter((line, index, all) => !unique || index === 0 || line !== all[index - 1])
    return ok(out.length ? `${out.join('\n')}\n` : '')
  })
}

function awkShim() {
  // POSIX awk treats a one-character -F (other than space) literally; just-bash treats it as a regex.
  return defineCommand('awk', async (args, ctx) => {
    const literal = (value: string) =>
      value.length === 1 && value !== ' ' ? value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : value
    const rewritten = args.map((arg, i) => {
      if (/^-F.$/.test(arg)) return `-F${literal(arg.slice(2))}`
      if (args[i - 1] === '-F') return literal(arg)
      return arg
    })
    return (await ctx.origCommand?.(rewritten)) ?? fail(1, '')
  })
}

function realpath() {
  return defineCommand('realpath', async (args, ctx) => {
    if (!ctx.exec) return fail(1, '')
    const result = await ctx.exec(
      `readlink -f ${args
        .filter((arg) => !arg.startsWith('-'))
        .map(shellQuote)
        .join(' ')}`,
      { cwd: ctx.cwd },
    )
    return result
  })
}

function sudo() {
  return defineCommand('sudo', async (args, ctx) => {
    const command = args.filter((arg, i) => !(i === 0 && arg.startsWith('-')))
    if (command.length === 0) return fail(1, 'usage: sudo command\n')
    return (await ctx.exec?.(command.map(shellQuote).join(' '), { cwd: ctx.cwd })) ?? fail(1, '')
  })
}

const simple = (name: string, stdout: string, exitCode = 0) =>
  defineCommand(name, async () => ({ stdout, stderr: '', exitCode }))

/** All the lab's mock and shim commands for a world. */
export function labCommands(lab: LabContext): CustomCommand[] {
  const systemctlCommand = systemctl(lab)
  return [
    ping(lab),
    ssh(lab),
    scp(lab),
    nc(lab),
    curl(lab),
    mail(lab, 'mail'),
    mail(lab, 'mailx'),
    sendmail(lab),
    getent(lab),
    nslookup(lab),
    host(lab),
    dig(lab),
    openssl(lab),
    psCommand(lab),
    pgrep(lab),
    pidof(lab),
    kill(lab),
    pkill(lab, 'pkill'),
    pkill(lab, 'killall'),
    fuser(lab),
    systemctlCommand,
    service(lab, systemctlCommand),
    ss(lab),
    lsof(lab),
    free(lab),
    uptime(lab),
    top(lab),
    df(lab),
    du(lab),
    id(lab),
    useradd(lab, 'useradd'),
    useradd(lab, 'adduser'),
    crontab(lab),
    docker(lab),
    kubectl(lab),
    az(lab),
    dateShim(lab),
    statShim(lab),
    sedShim(lab),
    xargs(),
    findShim(lab),
    touchShim(lab),
    gzipShim(lab, 'gzip'),
    gzipShim(lab, 'gunzip'),
    defineCommand('sleep', async () => ok()),
    zgrep(),
    sortShim(),
    awkShim(),
    realpath(),
    sudo(),
    simple('nproc', `${lab.world.cpus}\n`),
    simple('whoami', 'root\n'),
    simple('hostname', 'lab-01\n'),
    simple('logger', ''),
    defineCommand('trap', async () => ok()),
  ]
}

/** A remote host's shell: its own filesystem, disk, memory and nginx state. */
export async function remoteShell(host: Host, world: World): Promise<Bash> {
  const fs = new InMemoryFs()
  await fs.mkdir('/root', { recursive: true })
  for (const file of host.files ?? []) {
    await fs.mkdir(file.path.replace(/\/[^/]+$/, ''), { recursive: true })
    await fs.writeFile(file.path, file.content)
    await fs.utimes(file.path, new Date(file.mtime), new Date(file.mtime))
  }
  const sizeKb = 52_000_000
  const mini: World = {
    ...world,
    mounts: [
      { fs: '/dev/sda1', sizeKb, usedKb: Math.round((sizeKb * host.disk) / 100), mount: '/' },
    ],
    memory: {
      totalMb: 3936,
      usedMb: Math.round((3936 * host.mem) / 100),
      buffMb: 120,
      swapTotalMb: 0,
      swapUsedMb: 0,
    },
    services: {
      nginx: { state: host.nginx, restartWorks: true },
      sshd: { state: 'active', restartWorks: true },
    },
    processes:
      host.nginx === 'active'
        ? [
            {
              pid: 1201,
              user: 'root',
              cpu: 0.2,
              mem: 0.5,
              rssKb: 22_000,
              command: 'nginx: master process /usr/sbin/nginx',
              service: 'nginx',
              port: 80,
            },
          ]
        : [],
  }
  const context: LabContext = {
    world: mini,
    fs: fs as LabFs,
    remote: () => Promise.reject(new Error('nested ssh is not simulated')),
  }
  const keep = new Set([
    'df',
    'free',
    'systemctl',
    'uptime',
    'ps',
    'pgrep',
    'pidof',
    'date',
    'stat',
    'sed',
    'xargs',
    'service',
    'nproc',
    'whoami',
  ])
  const commands = labCommands(context).filter((command) => keep.has(command.name))
  const shell = new Bash({
    fs,
    cwd: '/root',
    env: { HOME: '/root', USER: 'root', TZ: labTimeZone() },
    customCommands: [...commands, simple('hostname', `${host.name}\n`)],
  })
  shell.registerTransformPlugin(splatCommandFix)
  return shell
}
