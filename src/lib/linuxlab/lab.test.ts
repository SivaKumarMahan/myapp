// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { linuxChallengeById } from '../../content/linuxlab'
import { checkChallenge, compareOutput } from './checks'
import { LinuxLab } from './lab'

/** just-bash in jsdom trips over cross-realm byte arrays, so these run in node. */

describe('LinuxLab shell', () => {
  it('keeps cwd, variables and functions between commands', async () => {
    const lab = await LinuxLab.create('main')
    await lab.run('cd /var/log/app; LIMIT=80; greet() { echo "hi $1"; }')
    const result = await lab.run('pwd; echo "$LIMIT"; greet bob')
    expect(result.stdout).toBe('/var/log/app\n80\nhi bob\n')
    expect(lab.cwd).toBe('/var/log/app')
  })

  it('sorts human-readable sizes correctly', async () => {
    const lab = await LinuxLab.create('main')
    expect((await lab.run("printf '901M a\\n16G b\\n4K c\\n' | sort -rh")).stdout).toBe(
      '16G b\n901M a\n4K c\n',
    )
  })

  it('treats a one-character awk -F literally', async () => {
    const lab = await LinuxLab.create('main')
    expect((await lab.run("echo a.b.c | awk -F. '{print $NF}'")).stdout).toBe('c\n')
  })

  it('uses GNU find -mtime rounding', async () => {
    const lab = await LinuxLab.create('main')
    await lab.run(
      "mkdir -p /t && touch -d '7 days ago' /t/seven && touch -d '8 days ago' /t/eight && touch -d '30 minutes ago' /t/new",
    )
    expect((await lab.run('find /t -type f -mtime +7')).stdout).toBe('/t/eight\n')
    expect((await lab.run('find /t -type f -mtime 7')).stdout).toBe('/t/seven\n')
    expect((await lab.run('find /t -type f -mmin -60')).stdout).toBe('/t/new\n')
  })

  it('runs "$@" and "${array[@]}" as a command', async () => {
    const lab = await LinuxLab.create('main')
    expect((await lab.run('f() { echo "[$1|$2]"; }; g() { "$@"; }; g f "a b" c')).stdout).toBe(
      '[a b|c]\n',
    )
    expect((await lab.run('cmd=(echo one "two three"); "${cmd[@]}"')).stdout).toBe(
      'one two three\n',
    )
  })

  it('freezes the clock at the world time', async () => {
    const lab = await LinuxLab.create('main', Date.UTC(2026, 9, 4, 12))
    expect((await lab.run('date +%s')).stdout.trim()).toBe(String(Date.UTC(2026, 9, 4, 12) / 1000))
  })

  it('sends mail and Slack messages to the outbox', async () => {
    const lab = await LinuxLab.create('main')
    await lab.run('echo body | mail -s "Disk alert" ops@example.com')
    await lab.run(
      `curl -s -X POST -d '{"text":"deploy done"}' https://hooks.slack.com/services/T/B/X`,
    )
    expect(lab.world.outbox.map((message) => [message.channel, message.subject])).toEqual([
      ['mail', 'Disk alert'],
      ['slack', 'deploy done'],
    ])
  })

  it('reports ssh failures like OpenSSH', async () => {
    const lab = await LinuxLab.create('main')
    const auth = await lab.run('ssh -o BatchMode=yes db-01 true')
    expect(auth.exitCode).toBe(255)
    expect(auth.stderr).toMatch(/Permission denied/)
    expect((await lab.run('ssh web-01 hostname')).stdout).toBe('web-01\n')
  })

  it('stops endless loops', async () => {
    const lab = await LinuxLab.create('main')
    const result = await lab.run('while true; do :; done', { timeoutMs: 300 })
    expect(result.timedOut).toBe(true)
  })
})

describe('checker', () => {
  it('compares outputs in plain words', () => {
    expect(compareOutput('a\nb\n', 'b\na\n', 'unordered')).toEqual([])
    expect(compareOutput('a\n', 'a\nb\n', 'unordered')).toEqual(['Missing from your output: “b”.'])
    expect(compareOutput('x 10.0.0.1 y', '10.0.0.1', 'tokens', '\\d+(?:\\.\\d+){3}')).toEqual([])
    expect(compareOutput('total 41', '42', 'numbers')).toHaveLength(1)
  })

  it('explains which file should have been kept', async () => {
    const challenge = linuxChallengeById.get('clean-old-logs')
    if (!challenge?.script) throw new Error('missing challenge')
    // Off by one: -mtime +2 removes logs the reference keeps.
    const script = challenge.solutions[0].replace('-mtime +"$days"', '-mtime +"$((days - 1))"')
    const report = await checkChallenge(challenge, { script }, { variants: ['main'] })
    const messages = report.results.flatMap((result) => result.messages).join('\n')
    expect(report.passed).toBe(false)
    expect(messages).toMatch(
      /You deleted \/var\/log\/app\/app-\d{4}-\d{2}-\d{2}\.log, but it's \d+ days old/,
    )
  }, 30_000)

  it('catches hard-coded answers with the hidden variant', async () => {
    const challenge = linuxChallengeById.get('disk-over-80')
    if (!challenge) throw new Error('missing challenge')
    const report = await checkChallenge(challenge, {
      steps: [{ kind: 'run', command: "printf '/ 91%%\\n/var 84%%\\n/mnt/backup 81%%\\n'" }],
    })
    expect(report.results.find((result) => result.variant === 'main')?.passed).toBe(true)
    expect(report.results.find((result) => result.variant === 'hidden')?.passed).toBe(false)
  }, 30_000)
})
