import type { LabChallenge } from '../types'

const SLACK = 'https://hooks.slack.com/services/T000/B000/XXXX'

export const logChallenges: LabChallenge[] = [
  {
    id: 'clean-old-logs',
    title: 'Script: clean old logs with a dry run',
    category: 'Logs',
    level: 'medium',
    type: 'script',
    scenario:
      'Daily application logs pile up in /var/log/app. You want a safe cleanup script you can run by hand first and from cron later.',
    task: 'Write **clean_logs.sh [--dry-run] DAYS DIR**. It deletes `*.log` files in DIR modified more than DAYS days ago (find’s `-mtime +DAYS`). For each deleted file it appends `deleted <path>` to **/var/log/cleanup.log**. With `--dry-run` it only prints `would delete <path>` for each file and changes nothing. If DAYS is not a number or DIR is not a directory, print a usage message to stderr and exit **2**.',
    seedFiles: ['/var/log/app'],
    hints: [
      'Handle the optional flag first: `if [ "${1:-}" = "--dry-run" ]; then dry=1; shift; fi`.',
      'Validate: `[[ "$days" =~ ^[0-9]+$ ]] && [ -d "$dir" ]`. List candidates with `find "$dir" -type f -name \'*.log\' -mtime +"$days"`.',
      'Loop with `while IFS= read -r f; do ... done < <(find ...)` and either echo or `rm -f "$f" && echo "deleted $f" >> /var/log/cleanup.log`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: clean_logs.sh [--dry-run] DAYS DIR" >&2; exit 2; }

dry=0
if [ "\${1:-}" = "--dry-run" ]; then dry=1; shift; fi
days="\${1:-}"
dir="\${2:-}"
[[ "$days" =~ ^[0-9]+$ ]] || usage
[ -d "$dir" ] || usage

while IFS= read -r f; do
  if (( dry )); then
    echo "would delete $f"
  else
    rm -f "$f"
    echo "deleted $f" >> /var/log/cleanup.log
  fi
done < <(find "$dir" -type f -name '*.log' -mtime +"$days")`,
    ],
    explanation: [
      { code: 'usage() { ...; exit 2; }', note: 'One place for the usage message and exit code.' },
      {
        code: 'if [ "${1:-}" = "--dry-run" ]; then dry=1; shift; fi',
        note: 'Optional flag first; `shift` moves DAYS into $1.',
      },
      {
        code: '[[ "$days" =~ ^[0-9]+$ ]] || usage',
        note: 'Reject anything that is not a whole number.',
      },
      { code: '[ -d "$dir" ] || usage', note: 'The directory must exist.' },
      {
        code: 'find "$dir" -type f -name \'*.log\' -mtime +"$days"',
        note: '-mtime +N: modified more than N full days ago.',
      },
      {
        code: 'while IFS= read -r f; do ... done < <(...)',
        note: 'Read one path per line, safely (spaces, backslashes).',
      },
      {
        code: 'echo "deleted $f" >> /var/log/cleanup.log',
        note: 'An audit trail of what was removed.',
      },
    ],
    checks: [
      { kind: 'files', dir: '/var/log/app', label: '/var/log/app' },
      {
        kind: 'probe',
        command: 'cat /var/log/cleanup.log 2>/dev/null',
        mode: 'unordered',
        label: '/var/log/cleanup.log',
      },
      { kind: 'output', mode: 'unordered', label: 'Printed' },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'clean_logs.sh',
      cases: [
        {
          label: 'Delete old logs',
          args: { main: ['7', '/var/log/app'], hidden: ['5', '/var/log/app'] },
        },
        { label: 'Dry run', args: ['--dry-run', '3', '/var/log/app'] },
        { label: 'Missing directory', args: ['7', '/var/log/nope'] },
        { label: 'Bad number', args: ['seven', '/var/log/app'] },
      ],
    },
    hiddenVariant: 'Twelve days of logs instead of ten, and a different age limit.',
    followUp:
      'Why is find -delete (or -exec rm) safer than `rm $(find ...)`? And when would you use logrotate instead?',
    repoRef: null,
    tags: ['find', 'arguments', 'dry run'],
  },
  {
    id: 'gzip-old-logs',
    title: 'Compress logs older than 3 days',
    category: 'Logs',
    level: 'simple',
    type: 'command',
    scenario: 'You want to keep old daily logs, just smaller.',
    task: 'Compress (gzip) every `app-*.log` file in **/var/log/app** that was modified **more than 3 days ago** (`-mtime +3`). Leave newer logs alone.',
    seedFiles: ['/var/log/app'],
    hints: [
      'Select the files with `find /var/log/app -name "app-*.log" -mtime +3`.',
      'Run a command on each match with `-exec ... {} \\;` or `-exec ... {} +`.',
      "`find /var/log/app -name 'app-*.log' -mtime +3 -exec gzip {} +`",
    ],
    solutions: [
      "find /var/log/app -name 'app-*.log' -mtime +3 -exec gzip {} +",
      "find /var/log/app -name 'app-*.log' -mtime +3 | xargs -r gzip",
    ],
    explanation: [
      {
        code: "find /var/log/app -name 'app-*.log'",
        note: 'Quote the pattern so the shell does not expand it first.',
      },
      { code: '-mtime +3', note: 'Modified more than 3 full days ago.' },
      {
        code: '-exec gzip {} +',
        note: 'gzip replaces each file with file.gz (keeping its timestamp).',
      },
    ],
    checks: [{ kind: 'files', dir: '/var/log/app', label: '/var/log/app' }],
    hiddenVariant: 'More days of logs.',
    followUp: 'How would you search inside the compressed logs later without unpacking them?',
    repoRef: null,
    tags: ['find', 'gzip'],
  },
  {
    id: 'backup-logs-tar',
    title: 'Script: timestamped log backup',
    category: 'Logs',
    level: 'medium',
    type: 'script',
    scenario: 'Before a risky change you want a quick archive of a log directory.',
    task: 'Write **backup_logs.sh SRC DEST**. Create DEST if needed, then create **DEST/logs-YYYYmmdd-HHMMSS.tar.gz** (current date and time) containing the files of SRC with **relative paths** (use `tar -C`). Print the archive path. If SRC is not a directory, print an error to stderr and exit 1.',
    seedFiles: ['/var/log/app', '/var/log/services'],
    hints: [
      'Build the name with `date +%Y%m%d-%H%M%S`.',
      '`tar -czf "$archive" -C "$src" .` changes into SRC first, so paths inside the archive are relative.',
      'Check `[ -d "$src" ]` first, and `mkdir -p "$dest"`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

src="\${1:?usage: backup_logs.sh SRC DEST}"
dest="\${2:?usage: backup_logs.sh SRC DEST}"
if [ ! -d "$src" ]; then
  echo "error: $src is not a directory" >&2
  exit 1
fi

mkdir -p "$dest"
archive="$dest/logs-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$archive" -C "$src" .
echo "$archive"`,
    ],
    explanation: [
      { code: 'src="${1:?usage: ...}"', note: 'Both arguments are required.' },
      { code: '[ ! -d "$src" ]', note: 'Fail clearly if there is nothing to back up.' },
      { code: 'mkdir -p "$dest"', note: 'Create the destination (no error if it exists).' },
      { code: 'date +%Y%m%d-%H%M%S', note: 'A sortable timestamp: 20261004-142501.' },
      {
        code: 'tar -czf "$archive" -C "$src" .',
        note: 'c=create, z=gzip, f=file; -C enters SRC so paths are relative.',
      },
    ],
    checks: [
      { kind: 'output', mode: 'tokens', pattern: '\\S+\\.tar\\.gz', label: 'Printed archive path' },
      {
        kind: 'probe',
        command:
          'for f in /backup/logs-*.tar.gz /mnt/archive/logs-*.tar.gz; do [ -f "$f" ] && { echo "$f"; tar -tzf "$f" | grep -v \'/$\' | sed \'s#.*/##\' | sort; }; done',
        mode: 'unordered',
        label: 'Archive contents',
      },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: {
      name: 'backup_logs.sh',
      cases: [
        {
          label: 'Back up app logs',
          args: {
            main: ['/var/log/app', '/backup'],
            hidden: ['/var/log/services', '/mnt/archive'],
          },
        },
        { label: 'Missing source', args: ['/var/log/nope', '/backup'] },
      ],
    },
    hiddenVariant: 'A different source directory and a destination that does not exist yet.',
    followUp: 'How do you restore just one file from the archive into /tmp?',
    repoRef: null,
    tags: ['tar', 'date'],
  },
  {
    id: 'rotate-logs-slack',
    title: 'Script: rotate logs and report to Slack',
    category: 'Logs',
    level: 'medium',
    type: 'script',
    scenario:
      'You are replacing a hand-run log rotation with a script that tells the team in Slack what it did.',
    task: `Write **rotate_logs.sh DIR**. For every \`*.log\` file directly in DIR: copy it to \`<file>.<YYYYmmdd>\`, gzip that copy, and empty the original (copy-truncate). Then post \`{"text":"Rotated N logs in DIR"}\` to the Slack webhook \`${SLACK}\` with curl. If DIR does not exist, post \`{"text":"Log rotation FAILED: DIR not found"}\` instead and exit 1.`,
    seedFiles: ['/var/log/services'],
    mockHosts: ['curl → Slack (Outbox)'],
    hints: [
      'Post JSON with `curl -s -X POST -H \'Content-type: application/json\' -d "{\\"text\\":\\"...\\"}" "$WEBHOOK"`.',
      'Loop with `for f in "$dir"/*.log; do [ -f "$f" ] || continue; ...; done` and count with `((count++))` or `count=$((count+1))`.',
      'Copy-truncate: `cp "$f" "$f.$stamp" && gzip "$f.$stamp" && : > "$f"`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -uo pipefail

WEBHOOK="${SLACK}"
dir="\${1:?usage: rotate_logs.sh DIR}"

notify() {
  curl -s -X POST -H 'Content-type: application/json' -d "{\\"text\\":\\"$1\\"}" "$WEBHOOK" > /dev/null
}

if [ ! -d "$dir" ]; then
  notify "Log rotation FAILED: $dir not found"
  exit 1
fi

stamp=$(date +%Y%m%d)
count=0
for f in "$dir"/*.log; do
  [ -f "$f" ] || continue
  cp "$f" "$f.$stamp"
  gzip "$f.$stamp"
  : > "$f"
  count=$((count + 1))
done

notify "Rotated $count logs in $dir"`,
    ],
    explanation: [
      {
        code: 'notify() { curl ... -d "{\\"text\\":\\"$1\\"}" "$WEBHOOK"; }',
        note: 'A Slack incoming webhook takes JSON with a "text" field.',
      },
      {
        code: '[ ! -d "$dir" ]',
        note: 'Report the failure to Slack too - silent failures in cron are the worst kind.',
      },
      {
        code: 'for f in "$dir"/*.log; do [ -f "$f" ] || continue',
        note: 'If nothing matches, the glob stays literal - skip it.',
      },
      { code: 'cp "$f" "$f.$stamp"; gzip "$f.$stamp"', note: 'Keep a dated, compressed copy.' },
      { code: ': > "$f"', note: 'Truncate in place: the app keeps writing to the same open file.' },
    ],
    checks: [
      { kind: 'files', dir: '/var/log/services', label: '/var/log/services' },
      {
        kind: 'probe',
        command: 'wc -c /var/log/services/*.log 2>/dev/null',
        mode: 'unordered',
        label: 'Original logs emptied',
      },
      {
        kind: 'outbox',
        channel: 'slack',
        pattern: 'Rotated \\d+|FAILED|/var/log/\\w+',
        label: 'Slack message',
      },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: {
      name: 'rotate_logs.sh',
      cases: [
        { label: 'Rotate', args: ['/var/log/services'] },
        { label: 'Missing directory', args: { main: ['/var/log/missing'], hidden: ['/srv/logs'] } },
      ],
    },
    hiddenVariant: 'Different log contents; a different missing directory.',
    followUp:
      'Why copy-truncate instead of mv + restarting the app, and what can be lost between the copy and the truncate?',
    repoRef: null,
    tags: ['curl', 'slack', 'gzip'],
  },
  {
    id: 'count-errors',
    title: 'How many ERROR lines?',
    category: 'Logs',
    level: 'simple',
    type: 'command',
    scenario: 'Someone asks "how many errors did the app log?".',
    task: 'Count the lines containing **ERROR** in **/var/log/app/app.log**.',
    seedFiles: ['/var/log/app/app.log'],
    hints: [
      'grep can count matching lines itself.',
      'The flag is `-c`.',
      '`grep -c ERROR /var/log/app/app.log`',
    ],
    solutions: ['grep -c ERROR /var/log/app/app.log', 'grep ERROR /var/log/app/app.log | wc -l'],
    explanation: [
      {
        code: 'grep -c ERROR file',
        note: 'Prints the number of matching lines (not matches - a line with two ERRORs counts once).',
      },
    ],
    checks: [{ kind: 'output', mode: 'numbers', label: 'Count' }],
    hiddenVariant: 'A different log with a different number of errors.',
    followUp: 'How would you count errors per hour?',
    repoRef: null,
    tags: ['grep'],
  },
  {
    id: 'check-errors-mail',
    title: 'Script: email when a log has errors',
    category: 'Logs',
    level: 'medium',
    type: 'script',
    scenario:
      'You want a check you can point at any log that emails ops only when there are errors.',
    task: 'Write **check_errors.sh LOGFILE**. Count the ERROR lines and print `<N> ERROR lines in <LOGFILE>`. If N > 0, email **ops@example.com** with the subject `<N> ERROR lines in <LOGFILE>` and the **last 5 ERROR lines** as the body, then exit 1. If N is 0, send nothing and exit 0. If the file does not exist, print an error to stderr and exit 2.',
    seedFiles: ['/var/log/app'],
    mockHosts: ['mail (→ Outbox)'],
    hints: [
      '`grep -c` exits 1 when the count is 0 - with `set -e` add `|| true`.',
      'Body: `grep ERROR "$log" | tail -n 5 | mail -s "$subject" ops@example.com`.',
      'Check `[ -f "$log" ]` first and exit 2.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

log="\${1:?usage: check_errors.sh LOGFILE}"
if [ ! -f "$log" ]; then
  echo "error: $log not found" >&2
  exit 2
fi

count=$(grep -c ERROR "$log" || true)
echo "$count ERROR lines in $log"

if (( count > 0 )); then
  grep ERROR "$log" | tail -n 5 | mail -s "$count ERROR lines in $log" ops@example.com
  exit 1
fi`,
    ],
    explanation: [
      {
        code: '[ ! -f "$log" ] ... exit 2',
        note: 'Distinguish "could not check" (2) from "found errors" (1).',
      },
      {
        code: 'count=$(grep -c ERROR "$log" || true)',
        note: 'grep exits 1 for zero matches; `|| true` stops set -e killing the script.',
      },
      {
        code: 'grep ERROR "$log" | tail -n 5 | mail -s ... ops@example.com',
        note: 'The last five errors become the email body (mail reads stdin).',
      },
      { code: 'exit 1', note: 'Non-zero tells cron or a monitor that something needs attention.' },
    ],
    checks: [
      { kind: 'output', mode: 'numbers', label: 'Printed count' },
      {
        kind: 'outbox',
        channel: 'mail',
        pattern: '\\d+(?= ERROR lines)|/[\\w/.-]+\\.log',
        label: 'Email',
      },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'check_errors.sh',
      cases: [
        {
          label: 'Log with errors',
          args: { main: ['/var/log/app/app.log'], hidden: ['/var/log/services/api.log'] },
        },
        { label: 'Clean log', args: ['/var/log/app/healthcheck.log'] },
        { label: 'Missing file', args: ['/var/log/app/nope.log'] },
      ],
    },
    hiddenVariant: 'A different log file with a different number of errors.',
    followUp:
      'This runs every 5 minutes and the same old errors trigger an email each time. How would you only alert on new errors?',
    repoRef: null,
    tags: ['grep', 'mail', 'exit codes'],
  },
  {
    id: 'top-ips',
    title: 'Top 5 client IPs in the access log',
    category: 'Logs',
    level: 'simple',
    type: 'command',
    scenario: 'Traffic spiked. Who is hitting the web server hardest?',
    task: 'From **/var/log/nginx/access.log**, show the **5 IP addresses with the most requests**, busiest first, with their counts.',
    seedFiles: ['/var/log/nginx/access.log'],
    hints: [
      'The client IP is the first field.',
      'Count with `sort | uniq -c`, then rank with `sort -rn`.',
      "`awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -5`",
    ],
    solutions: [
      "awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -5",
      "cut -d' ' -f1 /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 5",
    ],
    explanation: [
      { code: "awk '{print $1}'", note: 'Field 1 of the combined log format is the client IP.' },
      { code: 'sort | uniq -c', note: 'Group identical IPs and count them.' },
      { code: 'sort -rn | head -5', note: 'Highest count first, keep five.' },
    ],
    checks: [
      {
        kind: 'output',
        mode: 'tokens',
        pattern: '\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b',
        ordered: true,
        label: 'IPs in order',
      },
      { kind: 'output', mode: 'numbers', label: 'Counts' },
    ],
    hiddenVariant: 'Different clients and counts.',
    followUp: 'How would you show the top IPs for only the last hour?',
    repoRef: null,
    tags: ['awk', 'uniq', 'nginx'],
  },
  {
    id: 'status-counts',
    title: 'Count requests by HTTP status',
    category: 'Logs',
    level: 'simple',
    type: 'command',
    scenario: 'Users report errors; you want the overall status code mix.',
    task: 'From **/var/log/nginx/access.log**, count requests per HTTP status code, printed as `count status` (like `uniq -c`).',
    seedFiles: ['/var/log/nginx/access.log'],
    hints: [
      'In the combined format the status is field 9.',
      "`awk '{print $9}'` extracts it.",
      "`awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn`",
    ],
    solutions: [
      "awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn",
      "awk '{n[$9]++} END {for (s in n) print n[s], s}' /var/log/nginx/access.log",
    ],
    explanation: [
      {
        code: "awk '{print $9}'",
        note: 'IP - - [date zone] "METHOD path proto" STATUS: the quoted request counts as three fields.',
      },
      { code: 'sort | uniq -c | sort -rn', note: 'Count each status, most common first.' },
      { code: "awk '{n[$9]++} END {...}'", note: 'Or count in one pass with an awk array.' },
    ],
    checks: [{ kind: 'output', mode: 'unordered', label: 'Counts per status' }],
    hiddenVariant: 'A different access log.',
    followUp: 'How would you print the error rate (4xx + 5xx as a percentage of all requests)?',
    repoRef: null,
    tags: ['awk', 'nginx'],
  },
  {
    id: 'time-window',
    title: 'Log lines between 10:00 and 10:30 yesterday',
    category: 'Logs',
    level: 'medium',
    type: 'command',
    scenario:
      'An incident happened yesterday morning. You need exactly the log lines from that window.',
    task: 'From **/var/log/app/app.log**, print the lines from **yesterday between 10:00:00 and 10:30:00 inclusive**. Lines start with `YYYY-MM-DD HH:MM:SS`. Don’t hard-code the date.',
    seedFiles: ['/var/log/app/app.log'],
    hints: [
      'Yesterday’s date: `date -d yesterday +%F`.',
      'Times in HH:MM:SS compare correctly as strings.',
      '`awk -v d="$(date -d yesterday +%F)" \'$1 == d && $2 >= "10:00:00" && $2 <= "10:30:00"\' /var/log/app/app.log`',
    ],
    solutions: [
      `awk -v d="$(date -d yesterday +%F)" '$1 == d && $2 >= "10:00:00" && $2 <= "10:30:00"' /var/log/app/app.log`,
      `d=$(date -d yesterday +%F); awk -v s="$d 10:00:00" -v e="$d 10:30:00" '($1" "$2) >= s && ($1" "$2) <= e' /var/log/app/app.log`,
    ],
    explanation: [
      { code: 'date -d yesterday +%F', note: 'Yesterday as YYYY-MM-DD - nothing hard-coded.' },
      { code: 'awk -v d="..."', note: 'Pass a shell value into awk as a variable.' },
      { code: '$1 == d', note: 'Field 1 is the date.' },
      {
        code: '$2 >= "10:00:00" && $2 <= "10:30:00"',
        note: 'Zero-padded times sort as strings, so a string range works. Both ends inclusive.',
      },
    ],
    checks: [{ kind: 'output', mode: 'exact', label: 'Lines in the window' }],
    hiddenVariant: 'Different lines, including some just inside and just outside both edges.',
    followUp: 'How would you do the same for a log that spans midnight, e.g. 23:50 to 00:10?',
    repoRef: null,
    tags: ['awk', 'date'],
  },
  {
    id: 'tail-warn-error',
    title: 'Recent warnings and errors',
    category: 'Logs',
    level: 'simple',
    type: 'command',
    scenario: 'You just want to see what has gone wrong recently.',
    task: 'Show only the **WARN and ERROR** lines among the **last 50 lines** of **/var/log/app/app.log**.',
    seedFiles: ['/var/log/app/app.log'],
    hints: [
      '`tail -n 50` gives the last 50 lines.',
      'grep can match either word with an extended regex.',
      "`tail -n 50 /var/log/app/app.log | grep -E 'WARN|ERROR'`",
    ],
    solutions: [
      "tail -n 50 /var/log/app/app.log | grep -E 'WARN|ERROR'",
      'tail -50 /var/log/app/app.log | grep -e WARN -e ERROR',
    ],
    explanation: [
      {
        code: 'tail -n 50',
        note: 'Last 50 lines first - then filter, so you get the warnings within them.',
      },
      { code: "grep -E 'WARN|ERROR'", note: '-E enables | (alternation).' },
    ],
    checks: [{ kind: 'output', mode: 'exact', label: 'Lines' }],
    hiddenVariant: 'A different log.',
    followUp: 'What is the difference between this and `grep -E "WARN|ERROR" file | tail -n 50`?',
    repoRef: null,
    tags: ['tail', 'grep'],
  },
  {
    id: 'noisiest-log',
    title: 'Which service log has the most errors?',
    category: 'Logs',
    level: 'medium',
    type: 'command',
    scenario:
      'Four services log to /var/log/services. You want to know which one to look at first.',
    task: 'Print **only** the log file in **/var/log/services** with the most ERROR lines, and its count.',
    seedFiles: ['/var/log/services'],
    hints: [
      '`grep -c ERROR /var/log/services/*.log` prints file:count for each file.',
      'Sort on the count: `sort -t: -k2 -rn`.',
      '`grep -c ERROR /var/log/services/*.log | sort -t: -k2 -rn | head -1`',
    ],
    solutions: [
      'grep -c ERROR /var/log/services/*.log | sort -t: -k2 -rn | head -1',
      'for f in /var/log/services/*.log; do echo "$(grep -c ERROR "$f") $f"; done | sort -rn | head -1',
    ],
    explanation: [
      {
        code: 'grep -c ERROR /var/log/services/*.log',
        note: 'With several files, grep prefixes each count with the file name.',
      },
      {
        code: 'sort -t: -k2 -rn',
        note: 'Split on ":" and sort numerically by field 2, highest first.',
      },
      { code: 'head -1', note: 'Just the noisiest.' },
    ],
    checks: [
      {
        kind: 'output',
        mode: 'tokens',
        pattern: '\\b(?:api|worker|billing|auth)\\b',
        label: 'Noisiest log',
      },
      { kind: 'output', mode: 'numbers', label: 'Its count' },
    ],
    hiddenVariant: 'A different service is the noisiest.',
    followUp: 'How would you rank them by errors per line instead of the raw count?',
    repoRef: null,
    tags: ['grep', 'sort'],
  },
]
