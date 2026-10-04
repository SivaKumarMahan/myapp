import type { LabChallenge } from '../types'

export const diskChallenges: LabChallenge[] = [
  {
    id: 'disk-over-80',
    title: 'Mounts above 80% full',
    category: 'Disk & files',
    level: 'simple',
    type: 'command',
    scenario:
      'A monitoring dashboard is down and you need a quick view of which filesystems are getting full.',
    task: 'Show disk usage for all mounted filesystems and print **only** those above 80% use - the mount point and its use%.',
    seedFiles: [],
    mockHosts: ['df'],
    hints: [
      '`df -h` lists every mount; the 5th column is Use% and the 6th is the mount point.',
      'Skip the header with `NR>1` in awk, and strip the `%` before comparing: `sub("%","",x)`.',
      '`df -h | awk \'NR>1 { u=$5; sub("%","",u); if (u+0 > 80) print $6, $5 }\'`',
    ],
    solutions: [
      `df -h | awk 'NR>1 { use=$5; sub("%","",use); if (use+0 > 80) print $6, $5 }'`,
      `df -h --output=pcent,target | awk 'NR>1 && $1+0 > 80'`,
    ],
    explanation: [
      { code: 'df -h', note: 'Every mounted filesystem with human-readable sizes.' },
      { code: "awk 'NR>1 { ... }'", note: 'Skip the header line.' },
      {
        code: 'use=$5; sub("%","",use)',
        note: 'Copy Use% and drop the % sign so it compares as a number.',
      },
      {
        code: 'if (use+0 > 80) print $6, $5',
        note: '`+0` forces a numeric comparison; print the mount and its use%.',
      },
    ],
    checks: [{ kind: 'output', mode: 'tokens', pattern: '\\d{1,3}%', label: 'Mounts above 80%' }],
    hiddenVariant: 'Different mounts and usage - only /data is above 80%.',
    followUp:
      'df says the disk is full but du on every directory adds up to much less. What is happening?',
    repoRef: null,
    tags: ['df', 'awk'],
  },
  {
    id: 'top-var-dirs',
    title: 'Top 5 largest directories under /var',
    category: 'Disk & files',
    level: 'simple',
    type: 'command',
    scenario: '/var keeps growing and you want to know where the space went.',
    task: 'List the **5 largest directories directly under /var**, biggest first, with their sizes.',
    seedFiles: ['/var'],
    hints: [
      '`du -sh /var/*` gives one total per directory.',
      '`sort -rh` sorts human-readable sizes (K, M, G) correctly, largest first.',
      '`du -sh /var/* 2>/dev/null | sort -rh | head -5`',
    ],
    solutions: [
      'du -sh /var/* 2>/dev/null | sort -rh | head -5',
      "du -h --max-depth=1 /var 2>/dev/null | sort -rh | sed -n '2,6p'",
    ],
    explanation: [
      {
        code: 'du -sh /var/*',
        note: 'One summarised (-s), human-readable (-h) total per entry in /var.',
      },
      {
        code: '2>/dev/null',
        note: 'Hide "permission denied" noise from directories you cannot read.',
      },
      { code: 'sort -rh', note: 'Human-numeric sort, reversed: 16G before 900M.' },
      { code: 'head -5', note: 'Keep the top five.' },
    ],
    checks: [
      {
        kind: 'output',
        mode: 'tokens',
        pattern: '/var/[\\w.-]+',
        ordered: true,
        label: 'Largest directories, in order',
      },
    ],
    hiddenVariant: 'Different directory sizes, so the order changes.',
    followUp: 'Why is sort -h needed here, and what would plain sort -n get wrong?',
    repoRef: null,
    tags: ['du', 'sort'],
  },
  {
    id: 'files-over-100m',
    title: 'Files larger than 100 MB',
    category: 'Disk & files',
    level: 'simple',
    type: 'command',
    scenario: 'The /data volume is filling up and you suspect a few huge files.',
    task: 'Find all **files** larger than 100 MB under **/data**.',
    seedFiles: ['/data'],
    hints: [
      '`find` can filter by size with `-size`.',
      '`+100M` means "more than 100 MiB"; add `-type f` so directories are skipped.',
      '`find /data -type f -size +100M`',
    ],
    solutions: [
      'find /data -type f -size +100M',
      'find /data -type f -size +100M -exec ls -lh {} +',
    ],
    explanation: [
      { code: 'find /data', note: 'Search /data recursively.' },
      { code: '-type f', note: 'Regular files only.' },
      { code: '-size +100M', note: 'Larger than 100 MiB (rounded up to whole MiB, as find does).' },
    ],
    checks: [{ kind: 'output', mode: 'tokens', pattern: '/data/\\S+', label: 'Files over 100 MB' }],
    hiddenVariant:
      'Different files, including one at 101 MB and one at 99 MB to test the boundary.',
    followUp: 'How would you find files over 100 MB that have not been modified for 30 days?',
    repoRef: null,
    tags: ['find'],
  },
  {
    id: 'biggest-file-script',
    title: 'Script: biggest file in a folder',
    category: 'Disk & files',
    level: 'simple',
    type: 'script',
    scenario:
      'You keep running the same pipeline to find the biggest file somewhere; time to make it a script.',
    task: 'Write **biggest.sh** that takes a directory as its first argument and prints the **path of the biggest file** under it (recursively). With no argument, print a usage message to stderr and exit with a non-zero status.',
    seedFiles: ['/data', '/var/log'],
    hints: [
      'Use `${1:?usage: ...}` or test `$#` to require the argument.',
      '`find "$dir" -type f -printf \'%s %p\\n\'` prints the size before each path.',
      "Sort numerically, take the first line and drop the size: `sort -rn | head -1 | cut -d' ' -f2-`.",
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

dir="\${1:?usage: biggest.sh <directory>}"
find "$dir" -type f -printf '%s %p\\n' | sort -rn | head -1 | cut -d' ' -f2-`,
      `#!/usr/bin/env bash
if [ $# -lt 1 ]; then
  echo "usage: biggest.sh <directory>" >&2
  exit 1
fi
find "$1" -type f -exec ls -l {} + | sort -k5 -rn | head -1 | awk '{print $NF}'`,
    ],
    explanation: [
      {
        code: 'set -euo pipefail',
        note: 'Stop on errors, unset variables and failures inside pipelines.',
      },
      {
        code: 'dir="${1:?usage: biggest.sh <directory>}"',
        note: 'Use $1, or print the usage message and exit 1 if it is missing.',
      },
      {
        code: 'find "$dir" -type f -printf \'%s %p\\n\'',
        note: 'Every file with its size in bytes first.',
      },
      { code: 'sort -rn | head -1', note: 'Biggest first, keep one line.' },
      {
        code: "cut -d' ' -f2-",
        note: 'Drop the size, keep the path (even if it contains spaces).',
      },
    ],
    checks: [
      { kind: 'output', mode: 'exact', label: 'Printed path' },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: {
      name: 'biggest.sh',
      cases: [
        { label: 'Search /data', args: ['/data'] },
        { label: 'Search /var/log', args: { main: ['/var/log'], hidden: ['/home/dev'] } },
        { label: 'No argument', args: [] },
      ],
    },
    hiddenVariant: 'Different file sizes, so a different file is the biggest.',
    followUp:
      'How would you make it print the top N files instead, with N as an optional second argument?',
    repoRef: null,
    tags: ['find', 'sort', 'arguments'],
  },
  {
    id: 'top10-files',
    title: 'Top 10 largest files on the system',
    category: 'Disk & files',
    level: 'simple',
    type: 'command',
    scenario:
      'The root disk is filling up and you want the biggest offenders anywhere on the system.',
    task: 'List the **10 largest files on the whole system**, largest first, with their sizes.',
    seedFiles: ['/'],
    hints: [
      'Start from `/` with `find -type f`.',
      'Get sizes with `du -h` (or `ls -l`) for each file, then sort.',
      '`find / -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10`',
    ],
    solutions: [
      'find / -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10',
      "find / -type f -printf '%s %p\\n' 2>/dev/null | sort -rn | head -10",
    ],
    explanation: [
      { code: 'find / -type f', note: 'Every regular file on the system.' },
      { code: '-exec du -h {} +', note: 'Size each file, passing many files per du call.' },
      { code: '2>/dev/null', note: 'Ignore unreadable paths (like /proc on a real system).' },
      { code: 'sort -rh | head -10', note: 'Largest first, top ten.' },
    ],
    checks: [
      {
        kind: 'output',
        mode: 'tokens',
        pattern:
          '/[\\w./-]+\\.(?:img|bin|log|hprof|qcow2|bak|iso|mp4|mkv|dump|csv|log\\.\\d)\\b|/\\S+/(?:data\\.img|extra\\.bin)',
        label: 'The ten largest files',
      },
    ],
    hiddenVariant: 'Different file sizes, so a different ten files are the largest.',
    followUp:
      'On a real server, why add -xdev to this find, and why can deleting a file not free its space?',
    repoRef: null,
    tags: ['find', 'du', 'sort'],
  },
  {
    id: 'root-full-cleanup',
    title: '/ is full: clean up safely',
    category: 'Disk & files',
    level: 'medium',
    type: 'command',
    scenario:
      'An alert says / is almost full. You suspect old dumps and rotated logs, but one of the big logs may still be in use.',
    task: 'Find files **over 1 GB under /var/log and /tmp**. Delete them, **except** any file a process still holds open (check with `lsof`) - deleting an open file frees nothing. Do a dry run first (print what you would delete), then delete.',
    seedFiles: ['/var/log', '/tmp'],
    mockHosts: ['lsof'],
    hints: [
      '`find /var/log /tmp -type f -size +1G` lists the candidates.',
      '`lsof FILE` exits 0 when some process has the file open.',
      'Loop over the files: skip if `lsof "$f" >/dev/null`, otherwise `rm -f "$f"`.',
    ],
    solutions: [
      `for f in $(find /var/log /tmp -type f -size +1G); do
  if lsof "$f" >/dev/null 2>&1; then
    echo "skip (open): $f"
  else
    echo "delete: $f"
    rm -f "$f"
  fi
done`,
      `find /var/log /tmp -type f -size +1G | while read -r f; do lsof "$f" >/dev/null 2>&1 && echo "keep $f" || rm -v "$f"; done`,
    ],
    explanation: [
      {
        code: 'find /var/log /tmp -type f -size +1G',
        note: 'Candidates: regular files over 1 GiB.',
      },
      {
        code: 'lsof "$f" >/dev/null 2>&1',
        note: 'Exit status 0 means a process has it open - the space would not be freed.',
      },
      {
        code: 'echo "skip (open): $f"',
        note: 'Report it instead (truncate it or restart the process later).',
      },
      { code: 'rm -f "$f"', note: 'Otherwise delete it.' },
    ],
    checks: [
      { kind: 'files', dir: '/var/log', match: '/var/log/(old|app/debug)', label: '/var/log' },
      { kind: 'files', dir: '/tmp', match: '\\.(hprof|part)$|/core\\.', label: '/tmp' },
    ],
    hiddenVariant: 'Different file sizes and an extra 1.5 GB core dump in /tmp.',
    followUp:
      'A process has a deleted 5 GB log open. How do you get the space back without restarting it?',
    repoRef: null,
    tags: ['find', 'lsof', 'rm'],
  },
  {
    id: 'disk-alert-script',
    title: 'Script: disk threshold alert',
    category: 'Disk & files',
    level: 'medium',
    type: 'script',
    scenario:
      'You want a cron-able script that emails the on-call team when any filesystem crosses a threshold.',
    task: 'Write **disk_alert.sh THRESHOLD**. For every filesystem whose use% is **above** THRESHOLD: print a line containing the mount and its use%, and send **one email per filesystem** to ops@example.com with `mail -s` (the subject must include the mount and use%). Exit **1** if any filesystem breached the threshold, **0** if none did, and **2** with a usage message if THRESHOLD is missing or not a number.',
    seedFiles: [],
    mockHosts: ['df', 'mail (→ Outbox)'],
    hints: [
      'Validate with `[[ "$1" =~ ^[0-9]+$ ]]`.',
      '`df -P | tail -n +2` gives one line per filesystem; read the fields with `while read -r fs size used avail pct mount`.',
      'Strip the % with `${pct%\\%}`, compare with `(( use > threshold ))`, and keep a flag to set the exit status. Use `done < <(df -P | tail -n +2)` so the flag survives the loop.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

threshold="\${1:-}"
if [[ ! "$threshold" =~ ^[0-9]+$ ]]; then
  echo "usage: disk_alert.sh <threshold-percent>" >&2
  exit 2
fi

breached=0
while read -r fs size used avail pct mount; do
  use="\${pct%\\%}"
  if (( use > threshold )); then
    echo "ALERT: $mount is at $pct (threshold \${threshold}%)"
    echo "$mount on $(hostname) is at $pct" | mail -s "Disk alert: $mount at $pct" ops@example.com
    breached=1
  fi
done < <(df -P | tail -n +2)

exit "$breached"`,
    ],
    explanation: [
      {
        code: 'threshold="${1:-}"',
        note: 'Default to empty so set -u does not abort before the usage check.',
      },
      {
        code: '[[ ! "$threshold" =~ ^[0-9]+$ ]]',
        note: 'Reject a missing or non-numeric threshold: usage, exit 2.',
      },
      {
        code: 'while read -r fs size used avail pct mount',
        note: 'Split each df line into named fields.',
      },
      {
        code: 'done < <(df -P | tail -n +2)',
        note: 'Feed the loop without a pipe, so `breached` is not lost in a subshell.',
      },
      { code: 'use="${pct%\\%}"', note: 'Drop the trailing % so it is a number.' },
      { code: '(( use > threshold ))', note: 'Integer comparison.' },
      {
        code: 'mail -s "Disk alert: $mount at $pct" ops@example.com',
        note: 'One alert per breached filesystem.',
      },
      {
        code: 'exit "$breached"',
        note: '1 if anything breached, 0 otherwise - so cron/monitoring can act on it.',
      },
    ],
    checks: [
      {
        kind: 'output',
        mode: 'tokens',
        pattern: '\\d{1,3}%(?!\\))',
        label: 'Reported filesystems',
      },
      { kind: 'outbox', channel: 'mail', pattern: '/[\\w/]*|\\d{1,3}%', label: 'Alert email' },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'disk_alert.sh',
      cases: [
        { label: 'Threshold', args: { main: ['80'], hidden: ['90'] } },
        { label: 'High threshold - nothing to alert', args: ['99'] },
        { label: 'Missing threshold', args: [] },
        { label: 'Not a number', args: ['eighty'] },
      ],
    },
    hiddenVariant: 'Different mounts and usage, and a different threshold.',
    followUp:
      'How would you stop this sending the same alert every 5 minutes while the disk stays full?',
    repoRef: null,
    tags: ['df', 'mail', 'exit codes'],
  },
  {
    id: 'bugfix-disk-monitor',
    title: 'Bug fix: the disk monitor never warns',
    category: 'Disk & files',
    level: 'medium',
    type: 'bugfix',
    scenario:
      'A colleague’s disk monitor has run in cron for weeks without a single warning - even when / hit 91%.',
    task: 'Find and fix the bug in **disk_monitor.sh** (it is open in the editor). Keep the message format: `WARNING: <mount> is <use>% full`. The threshold is the optional first argument (default 80).',
    seedFiles: [],
    mockHosts: ['df'],
    starter: `#!/bin/bash
# Warn when any filesystem is above the threshold (default 80)
THRESHOLD=\${1:-80}
df -h | grep -v Filesystem | while read line; do
  usage=$(echo $line | awk '{print $5}')
  mount=$(echo $line | awk '{print $6}')
  if [ $usage -gt $THRESHOLD ]; then
    echo "WARNING: $mount is \${usage}% full"
  fi
done`,
    hints: [
      'Run it: `bash disk_monitor.sh` - then look at what `$usage` actually contains.',
      '`$usage` is `91%`, and `[ 91% -gt 80 ]` is "integer expression expected", so the test is never true.',
      'Strip the % before comparing: `usage=${usage%\\%}` (or `tr -d %`).',
    ],
    solutions: [
      `#!/bin/bash
# Warn when any filesystem is above the threshold (default 80)
THRESHOLD=\${1:-80}
df -h | grep -v Filesystem | while read line; do
  usage=$(echo $line | awk '{print $5}' | tr -d '%')
  mount=$(echo $line | awk '{print $6}')
  if [ "$usage" -gt "$THRESHOLD" ]; then
    echo "WARNING: $mount is \${usage}% full"
  fi
done`,
    ],
    explanation: [
      {
        code: "awk '{print $5}' | tr -d '%'",
        note: 'The bug: Use% includes a % sign. Remove it so the value is a plain integer.',
      },
      {
        code: '[ "$usage" -gt "$THRESHOLD" ]',
        note: 'Now an integer comparison works; quoting avoids errors on empty values.',
      },
    ],
    checks: [{ kind: 'output', mode: 'unordered', label: 'Warnings' }],
    script: {
      name: 'disk_monitor.sh',
      cases: [
        { label: 'Default threshold', args: [] },
        { label: 'Custom threshold', args: { main: ['85'], hidden: ['94'] } },
      ],
    },
    hiddenVariant: 'Different mounts and usage.',
    followUp:
      'Why did the broken script exit 0 every time, and how would set -euo pipefail have helped (or not)?',
    repoRef: null,
    tags: ['debugging', 'test', 'df'],
  },
  {
    id: 'file-exists',
    title: 'Create a file only if it does not exist',
    category: 'Disk & files',
    level: 'simple',
    type: 'command',
    scenario: 'A setup step must not overwrite notes someone already wrote.',
    task: 'If **/root/notes.txt** exists, print `exists`. Otherwise create it containing the single line `TODO` and print `created`.',
    seedFiles: ['/root'],
    hints: [
      '`[ -f FILE ]` is true for an existing regular file.',
      'Use if / then / else / fi.',
      'Create with `echo TODO > /root/notes.txt`.',
    ],
    solutions: [
      'if [ -f /root/notes.txt ]; then echo exists; else echo TODO > /root/notes.txt; echo created; fi',
      '[[ -e /root/notes.txt ]] && echo exists || { echo TODO > /root/notes.txt; echo created; }',
    ],
    explanation: [
      {
        code: '[ -f /root/notes.txt ]',
        note: '-f: exists and is a regular file. (-e: exists at all; -d: directory; -s: non-empty; -r: readable.)',
      },
      { code: 'echo TODO > /root/notes.txt', note: 'Create it with default content.' },
    ],
    checks: [
      { kind: 'output', mode: 'exact', label: 'Printed' },
      { kind: 'file', path: '/root/notes.txt', label: 'notes.txt' },
    ],
    hiddenVariant: 'notes.txt already exists, with other content that must not be overwritten.',
    followUp: 'What is the difference between [ ] and [[ ]], and when does it matter?',
    repoRef: null,
    tags: ['test', 'if'],
  },
  {
    id: 'backup-writable',
    title: 'Is /backup there and writable?',
    category: 'Disk & files',
    level: 'simple',
    type: 'command',
    scenario: 'A backup job must fail fast if its target is missing.',
    task: 'If **/backup** is a directory and writable, print `OK: /backup is writable`. Otherwise print an error **to stderr** and **exit 1**.',
    seedFiles: ['/backup'],
    hints: [
      '`-d` tests for a directory, `-w` for writable.',
      'Combine them with `&&` inside the if.',
      'Send the error to stderr with `>&2`, then `exit 1`.',
    ],
    solutions: [
      'if [ -d /backup ] && [ -w /backup ]; then echo "OK: /backup is writable"; else echo "ERROR: /backup is missing or not writable" >&2; exit 1; fi',
    ],
    explanation: [
      { code: '[ -d /backup ] && [ -w /backup ]', note: 'Both conditions must hold.' },
      { code: '>&2', note: 'Errors go to stderr so they are not mistaken for normal output.' },
      { code: 'exit 1', note: 'A non-zero exit lets the caller (cron, a pipeline) stop.' },
    ],
    checks: [
      { kind: 'output', mode: 'exact', label: 'Printed' },
      { kind: 'exit', label: 'Exit status' },
    ],
    hiddenVariant: '/backup does not exist.',
    followUp:
      'Why might [ -w /backup ] be true for root even when the filesystem is mounted read-only?',
    repoRef: null,
    tags: ['test', 'exit codes'],
  },
  {
    id: 'recent-files',
    title: 'Files modified in the last 10 minutes',
    category: 'Disk & files',
    level: 'simple',
    type: 'command',
    scenario: 'Something changed on this box a few minutes ago and you want to know what.',
    task: 'Find files under **/etc, /tmp and /var/log** that were modified in the **last 10 minutes**.',
    seedFiles: ['/etc', '/tmp', '/var/log'],
    hints: [
      '`find` has time tests: `-mtime` counts days, `-mmin` counts minutes.',
      '`-mmin -10` means "less than 10 minutes ago".',
      '`find /etc /tmp /var/log -type f -mmin -10`',
    ],
    solutions: ['find /etc /tmp /var/log -type f -mmin -10'],
    explanation: [
      { code: 'find /etc /tmp /var/log', note: 'find accepts several starting points.' },
      { code: '-type f -mmin -10', note: 'Regular files modified less than 10 minutes ago.' },
    ],
    checks: [
      { kind: 'output', mode: 'tokens', pattern: '/\\S+', label: 'Recently modified files' },
    ],
    hiddenVariant: 'Different recently changed files.',
    followUp: 'How would you find files changed since a specific deployment at 14:05 today?',
    repoRef: null,
    tags: ['find'],
  },
  {
    id: 'count-extensions',
    title: 'Count files by extension',
    category: 'Disk & files',
    level: 'medium',
    type: 'command',
    scenario: 'You are sizing up an unfamiliar project.',
    task: 'Count the files in **/home/dev/project** (recursively) by extension, most common first, printed as `count extension` (like `uniq -c` does).',
    seedFiles: ['/home/dev/project'],
    hints: [
      'List files with `find -type f`.',
      "Keep only the extension: `sed 's/.*\\.//'`.",
      'Then `sort | uniq -c | sort -rn`.',
    ],
    solutions: [
      "find /home/dev/project -type f | sed 's/.*\\.//' | sort | uniq -c | sort -rn",
      "find /home/dev/project -type f -name '*.*' | awk -F. '{print $NF}' | sort | uniq -c | sort -rn",
    ],
    explanation: [
      { code: 'find /home/dev/project -type f', note: 'Every file, recursively.' },
      {
        code: "sed 's/.*\\.//'",
        note: 'Delete everything up to the last dot, leaving the extension.',
      },
      {
        code: 'sort | uniq -c',
        note: 'uniq only merges adjacent lines, so sort first; -c adds counts.',
      },
      { code: 'sort -rn', note: 'Most common first.' },
    ],
    checks: [{ kind: 'output', mode: 'unordered', label: 'Counts per extension' }],
    hiddenVariant: 'A different project with different extensions.',
    followUp: 'How would you also show the total size per extension?',
    repoRef: null,
    tags: ['find', 'sed', 'uniq'],
  },
  {
    id: 'empty-cleanup',
    title: 'Delete empty files and directories',
    category: 'Disk & files',
    level: 'simple',
    type: 'command',
    scenario: 'A job leaves empty files and folders behind in its work area.',
    task: 'Delete all **empty files and empty directories** under **/tmp/work** - and nothing else.',
    seedFiles: ['/tmp/work'],
    hints: [
      '`find -empty` matches empty files and empty directories.',
      'Delete files first, then directories (a directory may only become empty after its files go).',
      '`find /tmp/work -type f -empty -delete; find /tmp/work -type d -empty -delete`',
    ],
    solutions: [
      'find /tmp/work -type f -empty -delete && find /tmp/work -type d -empty -delete',
      'find /tmp/work -empty -delete',
    ],
    explanation: [
      { code: 'find /tmp/work -type f -empty -delete', note: 'Remove empty regular files.' },
      {
        code: 'find /tmp/work -type d -empty -delete',
        note: 'Then remove directories that are (now) empty. find works depth-first with -delete.',
      },
    ],
    checks: [{ kind: 'files', dir: '/tmp/work', label: '/tmp/work' }],
    hiddenVariant: 'Different empty files and directories.',
    followUp: 'Why would rmdir on every directory be a safer alternative to rm -rf here?',
    repoRef: null,
    tags: ['find'],
  },
]
