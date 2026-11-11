import {
  findObject,
  ingressHttp,
  listObjects,
  podHttp,
  resolveService,
  serviceHttp,
  type HttpResult,
} from './cluster'
import type { Cluster, PodRecord } from './types'

/**
 * curl, wget and nslookup - from your laptop (through the public ingress IP)
 * or from inside a Pod (cluster DNS, ClusterIPs, Pod IPs).
 */

export interface Output {
  stdout: string
  stderr: string
  exitCode: number
}

export type Origin = { kind: 'outside' } | { kind: 'pod'; pod: PodRecord }

interface Target {
  scheme: string
  host: string
  port: number
  path: string
}

export function parseUrl(raw: string): Target | null {
  const match = /^(?:(https?):\/\/)?([^/:?#]+)(?::(\d+))?([^#]*)?$/i.exec(raw.trim())
  if (!match) return null
  const scheme = (match[1] ?? 'http').toLowerCase()
  return {
    scheme,
    host: match[2].toLowerCase(),
    port: match[3] ? Number(match[3]) : scheme === 'https' ? 443 : 80,
    path:
      match[4] && match[4].length ? (match[4].startsWith('/') ? match[4] : `/${match[4]}`) : '/',
  }
}

const PUBLIC_SUFFIX = /\.(example\.com|example\.net|example\.org)$/

/** Does this name resolve to the ingress controller's public IP? */
export function resolvesToIngress(cluster: Cluster, host: string) {
  if (host === cluster.lbIp) return true
  if (PUBLIC_SUFFIX.test(host)) return true
  return listObjects(cluster, 'Ingress').some((ingress) =>
    (ingress.spec.rules ?? []).some((rule) => rule.host === host),
  )
}

type Resolved =
  | { kind: 'ingress'; ip: string }
  | { kind: 'service'; ip: string; fqdn: string }
  | { kind: 'pod'; ip: string; pod: PodRecord }
  | { kind: 'none' }

function resolveHost(cluster: Cluster, host: string, origin: Origin): Resolved {
  if (resolvesToIngress(cluster, host)) return { kind: 'ingress', ip: cluster.lbIp }
  if (origin.kind === 'outside') return { kind: 'none' }
  if (host === 'localhost' || host === '127.0.0.1')
    return { kind: 'pod', ip: '127.0.0.1', pod: origin.pod }
  const byIp = cluster.pods.find((pod) => pod.ip === host)
  if (byIp) return { kind: 'pod', ip: host, pod: byIp }
  const byClusterIp = listObjects(cluster, 'Service').find(
    (service) => service.spec.clusterIP === host,
  )
  if (byClusterIp)
    return {
      kind: 'service',
      ip: host,
      fqdn: `${byClusterIp.metadata.name}.${byClusterIp.metadata.namespace}.svc.cluster.local`,
    }
  const service = resolveService(cluster, host, origin.pod.namespace)
  if (service)
    return {
      kind: 'service',
      ip: service.spec.clusterIP ?? '',
      fqdn: `${service.metadata.name}.${service.metadata.namespace}.svc.cluster.local`,
    }
  return { kind: 'none' }
}

function request(
  cluster: Cluster,
  target: Target,
  origin: Origin,
  hostHeader?: string,
): HttpResult {
  const resolved = resolveHost(cluster, target.host, origin)
  if (resolved.kind === 'none')
    return { ok: false, exitCode: 6, message: `curl: (6) Could not resolve host: ${target.host}` }
  if (resolved.kind === 'ingress') {
    if (target.port !== 80 && target.port !== 443)
      return {
        ok: false,
        exitCode: 28,
        message: `curl: (28) Failed to connect to ${target.host} port ${target.port} after 10002 ms: Timeout was reached`,
      }
    return ingressHttp(cluster, hostHeader ?? target.host, target.path)
  }
  if (resolved.kind === 'pod')
    return podHttp(cluster, resolved.pod, target.port, target.path, target.host)
  const service = listObjects(cluster, 'Service').find(
    (entry) => entry.spec.clusterIP === resolved.ip,
  )
  if (!service)
    return { ok: false, exitCode: 6, message: `curl: (6) Could not resolve host: ${target.host}` }
  return serviceHttp(cluster, service, target.port, target.path, target.host)
}

const SSL_ERROR = `curl: (60) SSL certificate problem: self-signed certificate
More details here: https://curl.se/docs/sslcerts.html

curl failed to verify the legitimacy of the server and therefore could not
establish a secure connection to it. To learn more about this situation and
how to fix it, please visit the webpage mentioned above.`

const CURL_VALUE_FLAGS = new Set([
  '-o',
  '--output',
  '-w',
  '--write-out',
  '-H',
  '--header',
  '-m',
  '--max-time',
  '--connect-timeout',
  '-X',
  '--request',
  '-d',
  '--data',
  '-A',
  '--user-agent',
  '--resolve',
  '-u',
  '--user',
])

/** `curl` from a laptop (`outside`) or from inside a Pod. */
export function curl(cluster: Cluster, args: string[], origin: Origin): Output {
  const flags = new Set<string>()
  const values = new Map<string, string>()
  const headers: string[] = []
  let url: string | null = null
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg.startsWith('--') && arg.includes('=')) {
      const [name, ...rest] = arg.split('=')
      values.set(name, rest.join('='))
    } else if (CURL_VALUE_FLAGS.has(arg)) {
      const value = args[++index] ?? ''
      if (arg === '-H' || arg === '--header') headers.push(value)
      else values.set(arg, value)
    } else if (/^-[a-zA-Z]{2,}$/.test(arg)) {
      for (const letter of arg.slice(1)) flags.add(`-${letter}`)
    } else if (arg.startsWith('-')) flags.add(arg)
    else url = arg
  }
  if (flags.has('--help') || flags.has('-h'))
    return {
      stdout:
        'Usage: curl [options...] <url>\n -i, --include   Include response headers\n -I, --head      Show document info only\n -k, --insecure  Allow insecure server connections\n -s, --silent    Silent mode\n -v, --verbose   Make the operation more talkative\n -H, --header    Pass custom header(s) to server\n -o, --output    Write to file instead of stdout\n -w, --write-out Use output FORMAT after completion\n',
      stderr: '',
      exitCode: 0,
    }
  if (!url)
    return {
      stdout: '',
      stderr: "curl: try 'curl --help' or 'curl --manual' for more information",
      exitCode: 2,
    }
  const target = parseUrl(url)
  if (!target)
    return {
      stdout: '',
      stderr: `curl: (3) URL rejected: Malformed input to a URL function`,
      exitCode: 3,
    }
  const silent = flags.has('-s') || flags.has('--silent')
  const showErrors = !silent || flags.has('-S') || flags.has('--show-error')
  const hostHeader = headers
    .map((header) => /^host:\s*(.+)$/i.exec(header)?.[1]?.trim())
    .find((value): value is string => Boolean(value))
  const verbose = flags.has('-v') || flags.has('--verbose')
  const resolvedIp = (() => {
    const resolved = resolveHost(cluster, target.host, origin)
    return resolved.kind === 'none' ? '' : resolved.ip
  })()
  const trace: string[] = []
  if (verbose && resolvedIp) {
    trace.push(
      `* Host ${target.host}:${target.port} was resolved.`,
      `* IPv4: ${resolvedIp}`,
      `*   Trying ${resolvedIp}:${target.port}...`,
    )
  }
  if (
    target.scheme === 'https' &&
    resolvesToIngress(cluster, target.host) &&
    !(flags.has('-k') || flags.has('--insecure'))
  ) {
    const hasTls = listObjects(cluster, 'Ingress').some((ingress) =>
      (ingress.spec.tls ?? []).some(
        (tls) =>
          (tls.hosts ?? []).includes(hostHeader ?? target.host) &&
          tls.secretName &&
          findObject(cluster, 'Secret', tls.secretName, ingress.metadata.namespace),
      ),
    )
    if (!hasTls)
      return {
        stdout: '',
        stderr: [...trace, showErrors ? SSL_ERROR : ''].filter(Boolean).join('\n'),
        exitCode: 60,
      }
  }
  const result = request(cluster, target, origin, hostHeader)
  if (!result.ok) {
    if (verbose)
      trace.push(`* connect to ${resolvedIp} port ${target.port} failed: Connection refused`)
    return {
      stdout: '',
      stderr: [...trace, showErrors ? result.message : ''].filter(Boolean).join('\n'),
      exitCode: result.exitCode,
    }
  }
  if (verbose) {
    trace.push(
      `* Connected to ${target.host} (${resolvedIp}) port ${target.port}`,
      `> ${flags.has('-I') ? 'HEAD' : (values.get('-X') ?? 'GET')} ${target.path} HTTP/1.1`,
      `> Host: ${hostHeader ?? target.host}`,
      '> User-Agent: curl/8.17.0',
      '> Accept: */*',
      '> ',
      '* Request completely sent off',
      `< HTTP/1.1 ${result.status} ${result.reason}`,
      ...result.headers.map(([name, value]) => `< ${name}: ${value}`),
      '< ',
    )
  }
  const fail = (flags.has('-f') || flags.has('--fail')) && result.status >= 400
  const head = `HTTP/1.1 ${result.status} ${result.reason}\n${result.headers.map(([name, value]) => `${name}: ${value}`).join('\n')}\n`
  let body = ''
  if (flags.has('-I') || flags.has('--head')) body = head
  else {
    if (flags.has('-i') || flags.has('--include')) body += `${head}\n`
    body += `${result.body}\n`
  }
  const output = values.get('-o') ?? values.get('--output')
  if (output) body = ''
  if (fail) body = ''
  const writeOut = values.get('-w') ?? values.get('--write-out')
  if (writeOut)
    body += writeOut
      .replace(/%\{http_code\}|%\{response_code\}/g, String(result.status))
      .replace(/%\{remote_ip\}/g, resolvedIp)
      .replace(/%\{url_effective\}/g, url)
      .replace(/\\n/g, '\n')
  if (verbose) trace.push(`* Connection #0 to host ${target.host} left intact`)
  return {
    stdout: body,
    stderr: [
      ...trace,
      fail && showErrors ? `curl: (22) The requested URL returned error: ${result.status}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    exitCode: fail ? 22 : 0,
  }
}

/** busybox `wget -qO- URL`. */
export function wget(cluster: Cluster, args: string[], origin: Origin): Output {
  const quiet = args.some((arg) => /^-[a-zA-Z]*q/.test(arg))
  const url = args
    .filter(
      (arg, index) => !arg.startsWith('-') && args[index - 1] !== '-O' && args[index - 1] !== '-T',
    )
    .pop()
  if (!url)
    return {
      stdout: '',
      stderr:
        'BusyBox v1.37.0 (2024-09-26 21:31:42 UTC) multi-call binary.\n\nUsage: wget [-cqS] [-O FILE] [-T SEC] URL...',
      exitCode: 1,
    }
  const target = parseUrl(url)
  if (!target) return { stdout: '', stderr: `wget: bad address '${url}'`, exitCode: 1 }
  const result = request(cluster, target, origin)
  const resolved = resolveHost(cluster, target.host, origin)
  const ip = resolved.kind === 'none' ? '' : resolved.ip
  const connecting = quiet
    ? []
    : [
        `Connecting to ${target.host}${target.port !== 80 ? `:${target.port}` : ''} (${ip}:${target.port})`,
      ]
  if (!result.ok) {
    if (result.exitCode === 6)
      return {
        stdout: '',
        stderr: `wget: bad address '${target.host}${target.port !== 80 ? `:${target.port}` : ''}'`,
        exitCode: 1,
      }
    return {
      stdout: '',
      stderr: [
        ...connecting,
        `wget: can't connect to remote host (${ip}): Connection refused`,
      ].join('\n'),
      exitCode: 1,
    }
  }
  if (result.status >= 400)
    return {
      stdout: '',
      stderr: [
        ...connecting,
        `wget: server returned error: HTTP/1.1 ${result.status} ${result.reason}`,
      ].join('\n'),
      exitCode: 1,
    }
  return {
    stdout: `${result.body}\n`,
    stderr: [
      ...connecting,
      ...(quiet
        ? []
        : [
            'writing to stdout',
            '-                    100% |********************************|   ok  0:00:00 ETA',
            'written to stdout',
          ]),
    ].join('\n'),
    exitCode: 0,
  }
}

/** `nslookup NAME` from a Pod (CoreDNS at 10.0.0.10) or from outside. */
export function nslookup(cluster: Cluster, args: string[], origin: Origin): Output {
  const name = args.find((arg) => !arg.startsWith('-'))
  if (!name) return { stdout: '', stderr: 'Usage: nslookup HOST [DNS_SERVER]', exitCode: 1 }
  const host = name.toLowerCase()
  const server = origin.kind === 'pod' ? '10.0.0.10' : '168.63.129.16'
  const header = `Server:\t\t${server}\nAddress:\t${server}#53\n\n`
  if (resolvesToIngress(cluster, host))
    return {
      stdout: `${header}Non-authoritative answer:\nName:\t${host}\nAddress: ${cluster.lbIp}\n`,
      stderr: '',
      exitCode: 0,
    }
  if (origin.kind === 'pod') {
    const service = resolveService(cluster, host, origin.pod.namespace)
    if (service)
      return {
        stdout: `${header}Name:\t${service.metadata.name}.${service.metadata.namespace}.svc.cluster.local\nAddress: ${service.spec.clusterIP}\n`,
        stderr: '',
        exitCode: 0,
      }
    const fqdn = host.includes('.') ? host : `${host}.${origin.pod.namespace}.svc.cluster.local`
    return { stdout: header, stderr: `** server can't find ${fqdn}: NXDOMAIN`, exitCode: 1 }
  }
  return { stdout: header, stderr: `** server can't find ${host}: NXDOMAIN`, exitCode: 1 }
}
