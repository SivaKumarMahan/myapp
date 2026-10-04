import type { LabChallenge } from '../types'

export const fundamentalsChallenges: LabChallenge[] = [
  {
    id: 'add-numbers',
    title: 'Script: add two numbers, safely',
    category: 'Scripting fundamentals',
    level: 'simple',
    type: 'script',
    scenario:
      'Every script that takes arguments needs the same basics: count them, validate them, explain usage.',
    task: 'Write **add.sh A B** that prints the sum of two **integers** (negative numbers allowed). If there are not exactly two arguments, or either is not an integer, print `usage: add.sh A B` to stderr and exit 1.',
    seedFiles: [],
    hints: [
      '`$#` is the number of arguments.',
      'An integer: `[[ "$1" =~ ^-?[0-9]+$ ]]`.',
      'Add with `echo $(( a + b ))`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
usage() { echo "usage: add.sh A B" >&2; exit 1; }

[ $# -eq 2 ] || usage
[[ "$1" =~ ^-?[0-9]+$ && "$2" =~ ^-?[0-9]+$ ]] || usage

echo $(( $1 + $2 ))`,
    ],
    explanation: [
      { code: '[ $# -eq 2 ] || usage', note: 'Exactly two arguments.' },
      { code: '[[ "$1" =~ ^-?[0-9]+$ ]]', note: 'Optional minus, then digits only.' },
      { code: 'echo $(( $1 + $2 ))', note: 'Integer arithmetic.' },
    ],
    checks: [
      { kind: 'output', mode: 'exact', label: 'Sum' },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: {
      name: 'add.sh',
      cases: [
        { label: 'Two numbers', args: { main: ['3', '4'], hidden: ['10', '-25'] } },
        { label: 'One argument', args: ['3'] },
        { label: 'Not a number', args: ['3', 'x'] },
      ],
    },
    hiddenVariant: 'Different numbers, including a negative one.',
    followUp: 'How would you add decimals, since $(( )) is integer-only?',
    repoRef: null,
    tags: ['arguments', 'arithmetic'],
  },
  {
    id: 'count-files',
    title: 'Script: count files in a directory',
    category: 'Scripting fundamentals',
    level: 'simple',
    type: 'script',
    scenario: 'A small script, done properly: usage, validation, clear errors.',
    task: 'Write **count_files.sh DIR** that prints the number of **regular files** under DIR (recursively). With no argument, print `usage: count_files.sh DIR` to stderr and exit 1. If DIR is not a directory, print an error to stderr and exit 2.',
    seedFiles: ['/home/dev/project', '/etc/app'],
    hints: [
      'Check `$#` first, then `[ -d "$1" ]`.',
      '`find "$dir" -type f | wc -l` counts files.',
      'Errors go to stderr: `echo "..." >&2`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
if [ $# -ne 1 ]; then
  echo "usage: count_files.sh DIR" >&2
  exit 1
fi
if [ ! -d "$1" ]; then
  echo "error: $1 is not a directory" >&2
  exit 2
fi
find "$1" -type f | wc -l`,
    ],
    explanation: [
      { code: '[ $# -ne 1 ]', note: 'Wrong number of arguments: usage.' },
      { code: '[ ! -d "$1" ]', note: 'Different problem, different exit code.' },
      { code: 'find "$1" -type f | wc -l', note: 'One line per regular file, counted.' },
    ],
    checks: [
      { kind: 'output', mode: 'numbers', label: 'Count' },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'count_files.sh',
      cases: [
        { label: 'Project', args: ['/home/dev/project'] },
        { label: 'Config dir', args: ['/etc/app'] },
        { label: 'No argument', args: [] },
        { label: 'Not a directory', args: ['/etc/passwd'] },
      ],
    },
    hiddenVariant: 'Different directory contents.',
    followUp: 'File names can contain newlines. How would you count files robustly?',
    repoRef: null,
    tags: ['arguments', 'find'],
  },
  {
    id: 'etc-backup-keep5',
    title: 'Script: back up config, keep the last 5',
    category: 'Scripting fundamentals',
    level: 'medium',
    type: 'script',
    scenario: 'You back up /etc/app before every change, and old backups pile up.',
    task: 'Write **backup_etc.sh** (no arguments). Create **/srv/backups/etc-app-YYYYmmdd-HHMMSS.tar.gz** from **/etc/app**, then delete older `etc-app-*.tar.gz` files so that only the **5 newest** remain. Print the new archive’s path.',
    seedFiles: ['/etc/app', '/srv/backups'],
    hints: [
      '`tar -czf "$archive" -C /etc app` stores paths as app/...',
      '`ls -1t /srv/backups/etc-app-*.tar.gz` lists newest first.',
      '`tail -n +6` skips the first five lines; delete the rest with `xargs -r rm -f` or a while-read loop.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

dest=/srv/backups
archive="$dest/etc-app-$(date +%Y%m%d-%H%M%S).tar.gz"

mkdir -p "$dest"
tar -czf "$archive" -C /etc app
echo "$archive"

ls -1t "$dest"/etc-app-*.tar.gz | tail -n +6 | while IFS= read -r old; do
  rm -f "$old"
done`,
    ],
    explanation: [
      { code: 'tar -czf "$archive" -C /etc app', note: 'Archive /etc/app with relative paths.' },
      {
        code: 'ls -1t ... | tail -n +6',
        note: 'Newest first; everything from line 6 on is older than the newest five.',
      },
      {
        code: 'while IFS= read -r old; do rm -f "$old"; done',
        note: 'Delete those, one per line.',
      },
    ],
    checks: [
      { kind: 'files', dir: '/srv/backups', label: '/srv/backups' },
      { kind: 'output', mode: 'exact', label: 'Printed path' },
    ],
    script: { name: 'backup_etc.sh', cases: [{ label: 'Run', args: [] }] },
    hiddenVariant: 'Eight old backups instead of six.',
    followUp: 'Why is parsing ls output fragile, and when is it acceptable?',
    repoRef: null,
    tags: ['tar', 'retention'],
  },
  {
    id: 'backup-verify',
    title: 'Script: backup with checksum and retention',
    category: 'Scripting fundamentals',
    level: 'medium',
    type: 'script',
    scenario: 'A backup you cannot verify is a hope, not a backup.',
    task: 'Write **backup.sh SRC DEST KEEP**. Create `DEST/<name>-YYYYmmdd-HHMMSS.tar.gz` from SRC (`<name>` = the last path component of SRC), write its SHA-256 checksum to `<archive>.sha256` with `sha256sum`, verify it with `sha256sum -c`, then keep only the **KEEP newest** `*.tar.gz` files in DEST, deleting older ones together with their `.sha256` files. Print the archive path. Exit 1 if SRC is not a directory, 2 if KEEP is not a positive whole number.',
    seedFiles: ['/etc/app', '/var/log/services', '/srv/backups'],
    hints: [
      '`name=$(basename "$src")`; archive with `tar -czf "$archive" -C "$(dirname "$src")" "$name"`.',
      'Write the checksum from inside DEST so the file holds a relative name: `(cd "$dest" && sha256sum "$(basename "$archive")" > "$(basename "$archive").sha256")`.',
      'Retention: `ls -1t "$dest"/*.tar.gz | tail -n +$((keep + 1))` and `rm -f "$old" "$old.sha256"`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

src="\${1:-}"; dest="\${2:-}"; keep="\${3:-}"
[ -d "$src" ] || { echo "error: $src is not a directory" >&2; exit 1; }
[[ "$keep" =~ ^[1-9][0-9]*$ ]] || { echo "usage: backup.sh SRC DEST KEEP" >&2; exit 2; }

name=$(basename "$src")
file="$name-$(date +%Y%m%d-%H%M%S).tar.gz"
mkdir -p "$dest"
tar -czf "$dest/$file" -C "$(dirname "$src")" "$name"

cd "$dest"
sha256sum "$file" > "$file.sha256"
sha256sum -c "$file.sha256" > /dev/null
echo "$dest/$file"

ls -1t ./*.tar.gz | tail -n +$((keep + 1)) | while IFS= read -r old; do
  rm -f "$old" "$old.sha256"
done`,
    ],
    explanation: [
      {
        code: '[[ "$keep" =~ ^[1-9][0-9]*$ ]]',
        note: 'KEEP must be 1 or more - KEEP=0 would delete the backup you just made.',
      },
      {
        code: 'tar -czf "$dest/$file" -C "$(dirname "$src")" "$name"',
        note: 'Paths in the archive start at the folder name.',
      },
      {
        code: 'sha256sum "$file" > "$file.sha256"',
        note: 'Run inside DEST so the checksum file holds a relative name and still works if the folder moves.',
      },
      {
        code: 'sha256sum -c "$file.sha256" > /dev/null',
        note: 'Re-reads the archive and compares; a mismatch exits non-zero and set -e stops the script.',
      },
      { code: 'tail -n +$((keep + 1))', note: 'Everything after the KEEP newest.' },
      { code: 'rm -f "$old" "$old.sha256"', note: 'Remove the checksum with its archive.' },
    ],
    checks: [
      { kind: 'files', dir: '/srv/backups', label: '/srv/backups' },
      {
        kind: 'probe',
        command: 'cd /srv/backups && for f in *.sha256; do [ -f "$f" ] && sha256sum -c "$f"; done',
        mode: 'unordered',
        label: 'Checksums verify',
      },
      { kind: 'output', mode: 'exact', label: 'Printed path' },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'backup.sh',
      cases: [
        {
          label: 'Back up',
          args: {
            main: ['/etc/app', '/srv/backups', '3'],
            hidden: ['/var/log/services', '/srv/backups', '5'],
          },
        },
        { label: 'Bad KEEP', args: ['/etc/app', '/srv/backups', 'zero'] },
        { label: 'Missing source', args: ['/etc/nope', '/srv/backups', '3'] },
      ],
    },
    hiddenVariant: 'A different source, more old backups and a different KEEP.',
    followUp:
      'The checksum lives next to the archive. What does it protect against, and what does it not?',
    repoRef: null,
    tags: ['tar', 'sha256sum', 'retention'],
  },
  {
    id: 'retry',
    title: 'Script: retry a command',
    category: 'Scripting fundamentals',
    level: 'medium',
    type: 'script',
    scenario:
      'A health endpoint is flaky during deploys. Your pipeline should retry before giving up.',
    task: 'Write **retry.sh CMD [ARGS...]**. Run the command; if it fails, print `Attempt N/3 failed`, wait 2 seconds and try again - **at most 3 attempts**. Exit 0 as soon as it succeeds. After 3 failures print `Giving up after 3 attempts` to stderr and exit 1.',
    seedFiles: [],
    mockHosts: ['curl (mock endpoints)'],
    hints: [
      '`"$@"` runs all the arguments as a command, keeping their quoting.',
      'Loop with `for attempt in 1 2 3; do ... done`.',
      'Inside: `if "$@"; then exit 0; fi; echo "Attempt $attempt/3 failed"; sleep 2`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
[ $# -ge 1 ] || { echo "usage: retry.sh CMD [ARGS...]" >&2; exit 2; }

for attempt in 1 2 3; do
  if "$@"; then
    exit 0
  fi
  echo "Attempt $attempt/3 failed"
  [ "$attempt" -lt 3 ] && sleep 2
done

echo "Giving up after 3 attempts" >&2
exit 1`,
    ],
    explanation: [
      {
        code: 'if "$@"; then exit 0; fi',
        note: 'Run the command exactly as given; stop on the first success.',
      },
      { code: 'echo "Attempt $attempt/3 failed"', note: 'Say what happened.' },
      {
        code: '[ "$attempt" -lt 3 ] && sleep 2',
        note: 'Wait between attempts, not after the last one.',
      },
      { code: 'exit 1', note: 'All attempts failed.' },
    ],
    checks: [
      { kind: 'output', mode: 'exact', label: 'Output' },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: {
      name: 'retry.sh',
      cases: [
        {
          label: 'Health check',
          args: {
            main: ['curl', '-sf', 'https://api.example.com/health'],
            hidden: ['curl', '-sf', 'https://api.example.org/health'],
          },
        },
        { label: 'Command that fails', args: ['ls', '/nonexistent'] },
        { label: 'Command that works', args: ['echo', 'hello world'] },
      ],
    },
    hiddenVariant: 'The endpoint is healthy, so the first attempt succeeds.',
    followUp:
      'How would you add exponential back-off, and why do retries need a jitter in a large fleet?',
    repoRef: null,
    tags: ['loops', 'arguments'],
  },
  {
    id: 'read-env',
    title: 'Read KEY=VALUE pairs',
    category: 'Scripting fundamentals',
    level: 'simple',
    type: 'command',
    scenario: 'You need to see what an environment file sets, without sourcing it.',
    task: 'Read **/root/app.env** line by line and print each setting as `KEY -> VALUE`. Skip blank lines and comments (`#`).',
    seedFiles: ['/root/app.env'],
    hints: [
      '`IFS== read -r key value` splits each line at the first `=`.',
      'Skip with `[[ -z "$key" || "$key" == \\#* ]] && continue`.',
      'Wrap it in `while ...; do ...; done < /root/app.env`.',
    ],
    solutions: [
      `while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \\#* ]] && continue
  echo "$key -> $value"
done < /root/app.env`,
      `grep -v '^#' /root/app.env | grep -v '^$' | awk -F= '{print $1 " -> " $2}'`,
    ],
    explanation: [
      {
        code: "IFS='=' read -r key value",
        note: 'Split on the first = (the rest of the line goes into value).',
      },
      {
        code: '[[ -z "$key" || "$key" == \\#* ]] && continue',
        note: 'Skip blank lines and comments.',
      },
      { code: 'done < /root/app.env', note: 'Feed the file to the loop.' },
    ],
    checks: [{ kind: 'output', mode: 'exact', label: 'Settings' }],
    hiddenVariant: 'Different settings, with a blank line in the middle.',
    followUp: 'Why is `source app.env` risky for a file you did not write?',
    repoRef: null,
    tags: ['read', 'IFS'],
  },
  {
    id: 'rename-txt',
    title: 'Rename *.txt to *.bak (with spaces)',
    category: 'Scripting fundamentals',
    level: 'simple',
    type: 'command',
    scenario:
      'Reports must be renamed before an import job runs. One of them has a space in its name.',
    task: 'In **/tmp/reports**, rename every `*.txt` file to the same name ending in `.bak`. Other files stay as they are.',
    seedFiles: ['/tmp/reports'],
    hints: [
      'Loop over a glob: `for f in /tmp/reports/*.txt`.',
      '`${f%.txt}` removes the .txt suffix.',
      'Quote everything: `mv -- "$f" "${f%.txt}.bak"`.',
    ],
    solutions: [
      'for f in /tmp/reports/*.txt; do mv -- "$f" "${f%.txt}.bak"; done',
      'find /tmp/reports -name "*.txt" -exec sh -c \'mv "$1" "${1%.txt}.bak"\' _ {} \\;',
    ],
    explanation: [
      {
        code: 'for f in /tmp/reports/*.txt',
        note: 'A glob gives one item per file, spaces and all (unlike `for f in $(ls)`).',
      },
      { code: '"${f%.txt}.bak"', note: '% removes the shortest match from the end.' },
      {
        code: 'mv -- "$f" ...',
        note: 'Quotes keep "sales q3.txt" one argument; -- protects names starting with -.',
      },
    ],
    checks: [{ kind: 'files', dir: '/tmp/reports', label: '/tmp/reports' }],
    hiddenVariant: 'Different file names, including another with a space.',
    followUp: 'What happens with `for f in $(ls *.txt)` here, and why?',
    repoRef: null,
    tags: ['quoting', 'parameter expansion'],
  },
  {
    id: 'deploy-user',
    title: 'Does the deploy user exist?',
    category: 'Scripting fundamentals',
    level: 'simple',
    type: 'command',
    scenario: 'A setup step should create the deploy user only when it is missing.',
    task: 'If the user **deploy** exists, print `deploy exists`. Otherwise print the command you would run: `useradd -m -s /bin/bash deploy`.',
    seedFiles: ['/etc/passwd'],
    hints: [
      '`id USER` exits non-zero when the user does not exist.',
      'Hide its output with `&>/dev/null`.',
      '`if id deploy &>/dev/null; then echo "deploy exists"; else echo "useradd -m -s /bin/bash deploy"; fi`',
    ],
    solutions: [
      'if id deploy &>/dev/null; then echo "deploy exists"; else echo "useradd -m -s /bin/bash deploy"; fi',
      'getent passwd deploy >/dev/null && echo "deploy exists" || echo "useradd -m -s /bin/bash deploy"',
    ],
    explanation: [
      {
        code: 'id deploy &>/dev/null',
        note: 'Only the exit status matters; &> sends stdout and stderr away.',
      },
      {
        code: 'useradd -m -s /bin/bash deploy',
        note: '-m creates the home directory, -s sets the login shell.',
      },
    ],
    checks: [{ kind: 'output', mode: 'exact', label: 'Result' }],
    hiddenVariant: 'The deploy user already exists.',
    followUp:
      'What else does a deploy user usually need (keys, sudo rules), and how would you keep this idempotent?',
    repoRef: null,
    tags: ['users', 'idempotent'],
  },
  {
    id: 'bugfix-quoting',
    title: 'Bug fix: the archive script breaks on spaces',
    category: 'Scripting fundamentals',
    level: 'medium',
    type: 'bugfix',
    scenario:
      'The report archiver works for most files, but fails on "sales q3.txt" - and with no argument it says "archived" without doing anything.',
    task: 'Fix **archive_report.sh** (open in the editor). It must copy the given file into **/tmp/archive/** and print `archived <file>`. With no argument, or a file that does not exist, print an error to stderr and exit 1 - without printing "archived".',
    seedFiles: ['/tmp/reports'],
    starter: `#!/bin/bash
# Archive a report: archive_report.sh FILE
src=$1
mkdir -p /tmp/archive
cp $src /tmp/archive/
echo "archived $src"`,
    hints: [
      'Try it: `bash archive_report.sh "/tmp/reports/sales q3.txt"` - cp receives two arguments, not one.',
      'Quote every expansion: `cp -- "$src" /tmp/archive/`.',
      'Check first: `[ -f "$src" ] || { echo "error: ..." >&2; exit 1; }`.',
    ],
    solutions: [
      `#!/bin/bash
# Archive a report: archive_report.sh FILE
src="\${1:-}"
if [ -z "$src" ] || [ ! -f "$src" ]; then
  echo "usage: archive_report.sh FILE (an existing file)" >&2
  exit 1
fi
mkdir -p /tmp/archive
cp -- "$src" /tmp/archive/
echo "archived $src"`,
    ],
    explanation: [
      { code: 'src="${1:-}"', note: 'Empty instead of unset when no argument is given.' },
      {
        code: '[ -z "$src" ] || [ ! -f "$src" ]',
        note: 'Validate before acting. Unquoted, an empty $src made `[ ! -f ]` true-ish and cp complained.',
      },
      {
        code: 'cp -- "$src" /tmp/archive/',
        note: 'The bug: unquoted $src splits "sales q3.txt" into two arguments.',
      },
    ],
    checks: [
      { kind: 'files', dir: '/tmp/archive', label: '/tmp/archive' },
      { kind: 'output', mode: 'exact', label: 'Output' },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: {
      name: 'archive_report.sh',
      cases: [
        {
          label: 'Name with a space',
          args: { main: ['/tmp/reports/sales q3.txt'], hidden: ['/tmp/reports/audit log.txt'] },
        },
        {
          label: 'Plain name',
          args: { main: ['/tmp/reports/daily.txt'], hidden: ['/tmp/reports/jan.txt'] },
        },
        { label: 'No argument', args: [] },
        { label: 'Missing file', args: ['/tmp/reports/nope.txt'] },
      ],
    },
    hiddenVariant: 'Different report names.',
    followUp:
      'What does ShellCheck say about the original script, and which warnings would you enforce in CI?',
    repoRef: null,
    tags: ['debugging', 'quoting'],
  },
  {
    id: 'cron-cleanup',
    title: 'Install a cleanup script and schedule it',
    category: 'Scripting fundamentals',
    level: 'medium',
    type: 'command',
    scenario: 'Temp files pile up in /tmp. You want a nightly cleanup at 02:00.',
    task: 'Create **/usr/local/bin/cleanup.sh** that deletes `*.tmp` files under /tmp older than 7 days, make it **executable**, and add a crontab entry running it **every day at 02:00** - **keeping** the existing crontab entries. (Use the script editor to write the file, or a here-doc.)',
    seedFiles: ['/var/spool/cron/crontabs/root'],
    mockHosts: ['crontab'],
    hints: [
      "Script body: `find /tmp -type f -name '*.tmp' -mtime +7 -delete`. Then `chmod +x /usr/local/bin/cleanup.sh`.",
      'Cron fields: minute hour day-of-month month day-of-week → `0 2 * * *`.',
      'Append without losing entries: `(crontab -l; echo "0 2 * * * /usr/local/bin/cleanup.sh") | crontab -`.',
    ],
    solutions: [
      `cat > /usr/local/bin/cleanup.sh <<'EOF'
#!/bin/bash
find /tmp -type f -name '*.tmp' -mtime +7 -delete
EOF
chmod +x /usr/local/bin/cleanup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/cleanup.sh") | crontab -`,
    ],
    explanation: [
      {
        code: "cat > file <<'EOF' ... EOF",
        note: 'A quoted here-doc writes the text as-is (no expansion).',
      },
      { code: 'chmod +x', note: 'cron runs it directly, so it must be executable.' },
      { code: '0 2 * * *', note: 'At minute 0 of hour 2, every day.' },
      {
        code: '(crontab -l; echo "...") | crontab -',
        note: 'Current entries plus the new one, installed from stdin. `crontab file` alone would replace everything.',
      },
    ],
    checks: [
      {
        kind: 'probe',
        command: 'crontab -l',
        mode: 'tokens',
        pattern: '\\S+ \\S+ \\S+ \\S+ \\S+ /usr/local/bin/[\\w.-]+',
        label: 'Crontab',
      },
      {
        kind: 'probe',
        command: '[ -x /usr/local/bin/cleanup.sh ] && echo executable',
        mode: 'exact',
        label: 'cleanup.sh is executable',
      },
      {
        kind: 'probe',
        command:
          "touch -d '10 days ago' /tmp/old.tmp; touch /tmp/new.tmp; bash /usr/local/bin/cleanup.sh; ls /tmp/*.tmp",
        mode: 'unordered',
        label: 'cleanup.sh removes only old .tmp files',
      },
    ],
    hiddenVariant: 'Same task; the check also runs your script against old and new .tmp files.',
    followUp: 'Your cron job works by hand but not from cron. Name three likely causes.',
    repoRef: null,
    tags: ['cron', 'here-doc', 'chmod'],
  },
]
