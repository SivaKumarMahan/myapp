import type { LabChallenge } from '../types'

/** PIDs in the seeded process table - so any column layout is accepted, as long as the right processes appear in the right order. */
const PIDS = '\\b(?:1|812|910|4321|5120|5233|6001|6420|7001|7302|1501|1622)\\b(?![.%])'

export const processChallenges: LabChallenge[] = [
  {
    id: 'top-cpu',
    title: 'Top 5 processes by CPU',
    category: 'Processes & services',
    level: 'simple',
    type: 'command',
    scenario: 'The box is slow. Which processes are eating the CPU?',
    task: 'Show the **5 processes using the most CPU**, highest first, with at least their PID, user, %CPU, %MEM and command. (Then try the same sorted by memory.)',
    seedFiles: [],
    mockHosts: ['ps / top'],
    hints: [
      '`ps -eo` lets you choose the columns.',
      '`--sort=-%cpu` sorts descending by CPU.',
      '`ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -6` (6 = header + 5)',
    ],
    solutions: [
      'ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -6',
      'ps aux --sort=-%cpu | head -6',
    ],
    explanation: [
      {
        code: 'ps -eo pid,user,%cpu,%mem,comm',
        note: '-e every process, -o the columns you want.',
      },
      {
        code: '--sort=-%cpu',
        note: 'Sort by CPU, descending (the minus sign). Use --sort=-%mem for memory.',
      },
      { code: 'head -6', note: 'The header line plus five processes.' },
    ],
    checks: [
      {
        kind: 'output',
        mode: 'tokens',
        pattern: PIDS,
        ordered: true,
        label: 'Processes (by PID), in order',
      },
    ],
    hiddenVariant: 'Different processes are busy.',
    followUp:
      '%CPU in ps is an average over the process lifetime. How do you see what is busy right now?',
    repoRef: null,
    tags: ['ps', 'top'],
  },
  {
    id: 'kill-port-8080',
    title: 'Free up port 8080',
    category: 'Processes & services',
    level: 'simple',
    type: 'command',
    scenario:
      'A deploy fails with "address already in use: 8080". A stale process still holds the port.',
    task: 'Find the process **listening on TCP port 8080** and stop it. Don’t kill anything else.',
    seedFiles: [],
    mockHosts: ['ss / lsof / fuser / kill'],
    hints: [
      '`ss -ltnp` shows listening sockets with the owning process.',
      '`lsof -t -i :8080` prints just the PID.',
      '`kill $(lsof -t -i :8080)`',
    ],
    solutions: ['kill $(lsof -t -i :8080)', 'fuser -k 8080/tcp'],
    explanation: [
      {
        code: 'lsof -t -i :8080',
        note: '-i :8080 selects the socket; -t prints only PIDs (handy for kill).',
      },
      {
        code: 'kill $(...)',
        note: 'Sends SIGTERM so the process can shut down cleanly. Only use kill -9 if it ignores TERM.',
      },
      {
        code: 'fuser -k 8080/tcp',
        note: 'Alternative: find and kill whatever uses the port in one go.',
      },
    ],
    checks: [
      { kind: 'probe', command: 'ss -ltn', mode: 'unordered', label: 'Listening ports afterwards' },
    ],
    hiddenVariant: 'A different set of processes.',
    followUp: 'Why can kill -9 be harmful for a database or a Java app?',
    repoRef: null,
    tags: ['ss', 'lsof', 'kill'],
  },
  {
    id: 'memory-percent',
    title: 'Memory use as a percentage',
    category: 'Processes & services',
    level: 'simple',
    type: 'command',
    scenario: 'You want a single number for memory use, and a loud warning when it is high.',
    task: 'Print `Memory used: N%` (used ÷ total from `free -m`, as a whole number). If it is **above 90**, also print `ALERT: memory above 90%`.',
    seedFiles: [],
    mockHosts: ['free'],
    hints: [
      '`free -m` prints a `Mem:` line: total is field 2, used is field 3.',
      'awk can do the maths and the test.',
      '`free -m | awk \'/^Mem:/ {p = $3 * 100 / $2; printf "Memory used: %d%%\\n", p; if (p > 90) print "ALERT: memory above 90%"}\'`',
    ],
    solutions: [
      `free -m | awk '/^Mem:/ {p = $3 * 100 / $2; printf "Memory used: %d%%\\n", p; if (p > 90) print "ALERT: memory above 90%"}'`,
    ],
    explanation: [
      { code: "awk '/^Mem:/ {...}'", note: 'Only the memory line.' },
      { code: 'p = $3 * 100 / $2', note: 'used × 100 / total.' },
      {
        code: 'printf "Memory used: %d%%\\n", p',
        note: '%d truncates to a whole number; %% prints a literal %.',
      },
      {
        code: 'if (p > 90) print "ALERT..."',
        note: 'Compare the exact value, not the rounded one.',
      },
    ],
    checks: [
      { kind: 'output', mode: 'numbers', label: 'Percentage' },
      { kind: 'output', mode: 'tokens', pattern: '\\bALERT\\b', label: 'Alert' },
    ],
    hiddenVariant: 'Memory use is normal.',
    followUp: 'Why is "available" a better measure than "free" on Linux?',
    repoRef: null,
    tags: ['free', 'awk'],
  },
  {
    id: 'load-vs-cores',
    title: 'Is the load too high for this machine?',
    category: 'Processes & services',
    level: 'simple',
    type: 'command',
    scenario:
      'A load average of 3 is fine on 16 cores and terrible on 1. You want a check that knows the difference.',
    task: 'Compare the **1-minute load average** with the **number of CPU cores**. Print `HIGH load: <load> on <cores> cores` if the load is greater than the core count, otherwise `OK load: <load> on <cores> cores`.',
    seedFiles: ['/proc/loadavg'],
    mockHosts: ['nproc, uptime'],
    hints: [
      'The first field of `/proc/loadavg` is the 1-minute load; `nproc` prints the core count.',
      'bash arithmetic is integer-only - compare decimals with awk.',
      '`awk -v l="$load" -v c="$cores" \'BEGIN {exit !(l > c)}\'` exits 0 when load > cores.',
    ],
    solutions: [
      `load=$(cut -d' ' -f1 /proc/loadavg); cores=$(nproc)
if awk -v l="$load" -v c="$cores" 'BEGIN {exit !(l > c)}'; then echo "HIGH load: $load on $cores cores"; else echo "OK load: $load on $cores cores"; fi`,
    ],
    explanation: [
      { code: "cut -d' ' -f1 /proc/loadavg", note: 'The 1-minute load average.' },
      { code: 'nproc', note: 'Number of CPU cores available.' },
      {
        code: "awk ... 'BEGIN {exit !(l > c)}'",
        note: 'Decimal comparison; awk’s exit status becomes the if condition.',
      },
    ],
    checks: [
      { kind: 'output', mode: 'tokens', pattern: '\\b(?:HIGH|OK)\\b', label: 'Verdict' },
      { kind: 'output', mode: 'numbers', label: 'Load and cores' },
    ],
    hiddenVariant: 'More cores and a lower load.',
    followUp: 'Load is high but CPU is mostly idle. What does that tell you?',
    repoRef: null,
    tags: ['proc', 'awk'],
  },
]
