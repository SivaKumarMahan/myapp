import { InMemoryFs } from 'just-bash'
import { DAY, type World } from './world'

/**
 * The lab's filesystem: just-bash's in-memory filesystem, plus "sparse"
 * files that report a declared size (a 3 GB ISO is one byte in memory) so
 * `ls -l`, `find -size`, `du` and `sort -h` see realistic numbers.
 */
export class LabFs extends InMemoryFs {
  readonly sizes = new Map<string, number>()

  override async stat(path: string) {
    const stat = await super.stat(path)
    const size = this.sizes.get(normalise(path))
    return size === undefined ? stat : { ...stat, size }
  }

  override async lstat(path: string) {
    const stat = await super.lstat(path)
    const size = this.sizes.get(normalise(path))
    return size === undefined ? stat : { ...stat, size }
  }

  override async writeFile(...args: Parameters<InMemoryFs['writeFile']>) {
    // Writing a file replaces any declared size with the real one.
    this.sizes.delete(normalise(args[0]))
    return super.writeFile(...args)
  }

  override async rm(...args: Parameters<InMemoryFs['rm']>) {
    const target = normalise(args[0])
    for (const key of [...this.sizes.keys()])
      if (key === target || key.startsWith(`${target}/`)) this.sizes.delete(key)
    return super.rm(...args)
  }
}

const normalise = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path)

const dirname = (path: string) => path.replace(/\/[^/]*\/?$/, '') || '/'

/** Fills a filesystem from the world's seed, with matching mtimes. */
export async function seedFs(fs: LabFs, world: World) {
  const ensureDir = async (dir: string) => {
    if (dir && dir !== '/') await fs.mkdir(dir, { recursive: true })
  }
  for (const base of [
    '/root',
    '/tmp',
    '/etc',
    '/var/log',
    '/home',
    '/proc',
    '/usr/local/bin',
    '/var/spool/cron/crontabs',
    '/etc/ssl/certs',
    '/opt/app',
  ])
    await ensureDir(base)

  for (const file of world.files) {
    if (file.path.endsWith('/')) {
      const dir = normalise(file.path)
      await ensureDir(dir)
      await fs.utimes(dir, new Date(file.mtime), new Date(file.mtime))
      if (file.mode !== undefined) await fs.chmod(dir, file.mode)
      continue
    }
    await ensureDir(dirname(file.path))
    await fs.writeFile(file.path, file.content ?? '\0')
    if (file.size !== undefined && file.content === undefined)
      fs.sizes.set(file.path, Math.round(file.size))
    await fs.utimes(file.path, new Date(file.mtime), new Date(file.mtime))
    if (file.mode !== undefined) await fs.chmod(file.path, file.mode)
  }

  // /proc and friends, from the mocked machine state.
  const { memory, load, cpus } = world
  const freeMb = memory.totalMb - memory.usedMb - memory.buffMb
  await fs.writeFile(
    '/proc/loadavg',
    `${load.map((value) => value.toFixed(2)).join(' ')} 2/431 7302\n`,
  )
  await fs.writeFile(
    '/proc/meminfo',
    [
      `MemTotal:       ${memory.totalMb * 1024} kB`,
      `MemFree:        ${freeMb * 1024} kB`,
      `MemAvailable:   ${(freeMb + memory.buffMb) * 1024} kB`,
      `Buffers:        ${Math.round(memory.buffMb * 0.2) * 1024} kB`,
      `Cached:         ${Math.round(memory.buffMb * 0.8) * 1024} kB`,
      `SwapTotal:      ${memory.swapTotalMb * 1024} kB`,
      `SwapFree:       ${(memory.swapTotalMb - memory.swapUsedMb) * 1024} kB`,
    ].join('\n') + '\n',
  )
  await fs.writeFile(
    '/proc/cpuinfo',
    Array.from(
      { length: cpus },
      (_, i) => `processor\t: ${i}\nmodel name\t: Lab vCPU @ 2.4GHz\n`,
    ).join('\n'),
  )
  const old = new Date(world.now - 60 * DAY)
  await fs.writeFile('/var/spool/cron/crontabs/root', world.crontab)
  await fs.utimes('/var/spool/cron/crontabs/root', old, old)
  for (const domain of world.domains) {
    if (domain.certDays === null) continue
    await fs.writeFile(`/etc/ssl/certs/${domain.name}.pem`, certPem(domain.name))
    await fs.utimes(`/etc/ssl/certs/${domain.name}.pem`, old, old)
  }
}

/** The lab's stand-in for a PEM certificate: openssl x509 reads the marker. */
export const certPem = (name: string) =>
  `-----BEGIN CERTIFICATE-----\nLAB-CERT:${name}\nMIIFazCCA1OgAwIBAgIUQ0xBQi1TSU1VTEFURUQtQ0VSVElGSUNBVEU=\n-----END CERTIFICATE-----\n`
