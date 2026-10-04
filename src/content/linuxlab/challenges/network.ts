import type { LabChallenge } from '../types'

export const networkChallenges: LabChallenge[] = [
  {
    id: 'ping-check',
    title: 'Script: ping a list of servers',
    category: 'Network & servers',
    level: 'simple',
    type: 'script',
    scenario: 'After a network change you want a quick reachability check of every server.',
    task: 'Write **ping_check.sh FILE**. FILE has one IP or hostname per line; skip blank lines and lines starting with `#`. Ping each **once** (`ping -c 1 -W 2`) and print `UP <host>` or `DOWN <host>`, then a summary line `Total: N, Up: X, Down: Y`. Exit **1** if any host is down, otherwise 0. If FILE does not exist, print an error to stderr and exit **2**.',
    seedFiles: ['/root/servers.txt'],
    mockHosts: ['~10 mock hosts (some down)'],
    hints: [
      'Read lines with `while IFS= read -r host; do ... done < "$file"`.',
      'Skip with `[[ -z "$host" || "$host" == \\#* ]] && continue`.',
      'Use ping’s exit status: `if ping -c 1 -W 2 "$host" > /dev/null 2>&1; then ...`. Count with `((up++))` or `up=$((up + 1))`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -uo pipefail

file="\${1:?usage: ping_check.sh FILE}"
if [ ! -f "$file" ]; then
  echo "error: $file not found" >&2
  exit 2
fi

total=0; up=0; down=0
while IFS= read -r host; do
  [[ -z "$host" || "$host" == \\#* ]] && continue
  total=$((total + 1))
  if ping -c 1 -W 2 "$host" > /dev/null 2>&1; then
    echo "UP $host"
    up=$((up + 1))
  else
    echo "DOWN $host"
    down=$((down + 1))
  fi
done < "$file"

echo "Total: $total, Up: $up, Down: $down"
(( down == 0 ))`,
    ],
    explanation: [
      {
        code: 'while IFS= read -r host; do ... done < "$file"',
        note: 'One line at a time; the loop runs in the current shell, so the counters survive.',
      },
      {
        code: '[[ -z "$host" || "$host" == \\#* ]] && continue',
        note: 'Skip blank lines and comments.',
      },
      {
        code: 'ping -c 1 -W 2 "$host" > /dev/null 2>&1',
        note: 'One packet, wait at most 2 s; only the exit status matters.',
      },
      {
        code: 'total=$((total + 1))',
        note: 'Arithmetic expansion. (`((total++))` returns 1 when total was 0 - careful with set -e.)',
      },
      {
        code: '(( down == 0 ))',
        note: 'The last command sets the exit status: 0 if nothing was down, 1 otherwise.',
      },
    ],
    checks: [
      { kind: 'output', mode: 'unordered', label: 'Report' },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'ping_check.sh',
      cases: [
        { label: 'Server list', args: ['/root/servers.txt'] },
        { label: 'Missing file', args: ['/root/nope.txt'] },
      ],
    },
    hiddenVariant: 'A different subnet with different hosts down.',
    followUp:
      'ping succeeds but the app is still unreachable. What would you check next, and why is ICMP a weak health check?',
    repoRef: null,
    tags: ['ping', 'loops', 'exit codes'],
  },
  {
    id: 'ssh-check',
    title: 'Script: SSH reachability report (CSV)',
    category: 'Network & servers',
    level: 'medium',
    type: 'script',
    scenario:
      'Before running Ansible you want to know which hosts you can actually log in to - and why the others fail.',
    task: 'Write **ssh_check.sh FILE OUT**. For each host in FILE, try `ssh -n -o BatchMode=yes -o ConnectTimeout=5 HOST true`. Write a CSV to OUT with the header `host,status,reason` and one row per host in input order: `host,UP,OK`, or `host,DOWN,<reason>` where reason is **timeout**, **auth failed** or **port closed**, based on ssh’s error message.',
    seedFiles: ['/root/inventory.txt'],
    mockHosts: ['~10 mock hosts: OK, timeout, auth failure, port 22 closed'],
    hints: [
      'Capture the error: `err=$(ssh ... 2>&1 >/dev/null)` and keep the exit status in `rc=$?`.',
      'Classify with `case "$err" in *"timed out"*) ...;; *"Permission denied"*) ...;; *refused*) ...;; esac`.',
      'Write the header with `echo "host,status,reason" > "$out"` and append rows with `>>`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -uo pipefail

file="\${1:?usage: ssh_check.sh FILE OUT}"
out="\${2:?usage: ssh_check.sh FILE OUT}"

echo "host,status,reason" > "$out"
while IFS= read -r host; do
  [ -z "$host" ] && continue
  err=$(ssh -n -o BatchMode=yes -o ConnectTimeout=5 "$host" true 2>&1 >/dev/null)
  if [ $? -eq 0 ]; then
    echo "$host,UP,OK" >> "$out"
    continue
  fi
  case "$err" in
    *"timed out"*) reason="timeout" ;;
    *"Permission denied"*) reason="auth failed" ;;
    *refused*) reason="port closed" ;;
    *) reason="error" ;;
  esac
  echo "$host,DOWN,$reason" >> "$out"
done < "$file"`,
    ],
    explanation: [
      {
        code: 'ssh -n',
        note: '-n stops ssh reading stdin - otherwise it swallows the rest of the host list in a while-read loop.',
      },
      {
        code: '-o BatchMode=yes -o ConnectTimeout=5',
        note: 'Never prompt for a password; give up after 5 s.',
      },
      {
        code: 'err=$(ssh ... 2>&1 >/dev/null)',
        note: 'Order matters: stderr goes to the capture, stdout is discarded.',
      },
      { code: 'if [ $? -eq 0 ]', note: 'The exit status of the command substitution is ssh’s.' },
      { code: 'case "$err" in *"timed out"*) ...', note: 'Map ssh’s messages to a short reason.' },
    ],
    checks: [
      {
        kind: 'probe',
        command: 'cat /root/ssh_report.csv',
        mode: 'exact',
        label: '/root/ssh_report.csv',
      },
    ],
    script: {
      name: 'ssh_check.sh',
      cases: [{ label: 'Inventory', args: ['/root/inventory.txt', '/root/ssh_report.csv'] }],
    },
    hiddenVariant: 'Different hosts with different failure modes.',
    followUp:
      'Your while-read loop over hosts stops after the first ssh. Why, and what are two ways to fix it?',
    repoRef: null,
    tags: ['ssh', 'case', 'csv'],
  },
  {
    id: 'fleet-health',
    title: 'Script: fleet health over SSH',
    category: 'Network & servers',
    level: 'medium',
    type: 'script',
    scenario: 'You want a one-page health view of the fleet: disk, memory and whether nginx runs.',
    task: 'Write **fleet_health.sh FILE**. Print the CSV header `host,disk,mem,nginx`, then for each host in FILE one row. Over ssh (`ssh -n -o BatchMode=yes -o ConnectTimeout=5`): **disk** = use% of `/` from `df -P /` (e.g. `45%`), **mem** = used × 100 / total from `free -m`, as a whole number with `%` (e.g. `61%`), **nginx** = `systemctl is-active nginx`. If ssh to a host fails, print `host,UNREACHABLE,,`.',
    seedFiles: ['/root/inventory.txt'],
    mockHosts: ['~10 mock hosts'],
    hints: [
      'Test first: `ssh -n -o BatchMode=yes HOST true || { echo "$host,UNREACHABLE,,"; continue; }`.',
      'Disk: `ssh ... "$host" "df -P / | awk \'NR==2 {print \\$5}\'"` - escape `$5` so the remote awk sees it.',
      'Memory: `ssh ... "$host" free -m | awk \'/^Mem:/ {printf "%d%%", $3 * 100 / $2}\'` - running awk locally avoids the escaping. `systemctl is-active` exits 3 when inactive, so add `|| true`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -uo pipefail

file="\${1:?usage: fleet_health.sh FILE}"
remote() { ssh -n -o BatchMode=yes -o ConnectTimeout=5 "$@"; }

echo "host,disk,mem,nginx"
while IFS= read -r host; do
  [ -z "$host" ] && continue
  if ! remote "$host" true 2>/dev/null; then
    echo "$host,UNREACHABLE,,"
    continue
  fi
  disk=$(remote "$host" df -P / | awk 'NR==2 {print $5}')
  mem=$(remote "$host" free -m | awk '/^Mem:/ {printf "%d%%", $3 * 100 / $2}')
  nginx=$(remote "$host" systemctl is-active nginx || true)
  echo "$host,$disk,$mem,$nginx"
done < "$file"`,
    ],
    explanation: [
      {
        code: 'remote() { ssh -n -o BatchMode=yes -o ConnectTimeout=5 "$@"; }',
        note: 'A small function keeps the ssh options in one place; "$@" passes host and command through unchanged.',
      },
      { code: 'if ! remote "$host" true', note: 'A cheap connectivity test first.' },
      {
        code: 'remote "$host" df -P / | awk \'NR==2 {print $5}\'',
        note: 'Run df remotely, parse locally - no quoting puzzles.',
      },
      {
        code: 'awk \'/^Mem:/ {printf "%d%%", $3 * 100 / $2}\'',
        note: 'used × 100 / total, truncated to a whole number; %% prints a literal %.',
      },
      {
        code: 'systemctl is-active nginx || true',
        note: 'It prints active/inactive and exits non-zero when inactive.',
      },
    ],
    checks: [{ kind: 'output', mode: 'exact', label: 'CSV' }],
    script: {
      name: 'fleet_health.sh',
      cases: [{ label: 'Inventory', args: ['/root/inventory.txt'] }],
    },
    hiddenVariant: 'A different fleet with different disk, memory and nginx states.',
    followUp:
      'This makes four ssh connections per host. How would you do it in one, and how would you run hosts in parallel?',
    repoRef: null,
    tags: ['ssh', 'awk', 'arrays'],
  },
  {
    id: 'fetch-backup',
    title: 'Script: fetch the latest backup',
    category: 'Network & servers',
    level: 'medium',
    type: 'script',
    scenario: 'A restore drill: copy the newest backup from the backup server to this machine.',
    task: 'Write **fetch_backup.sh HOST DEST**. Find the **newest** `/backups/*.tar.gz` on HOST (use `ls -1t` over ssh), copy it into DEST with `scp`, and print the local path of the copy. If ssh fails or there are no backups, print an error to stderr and exit 1.',
    seedFiles: ['/restore'],
    mockHosts: ['bkp-01 (has /backups/*.tar.gz)', 'db-01 (SSH auth fails)'],
    hints: [
      '`latest=$(ssh -n -o BatchMode=yes "$host" \'ls -1t /backups/*.tar.gz\' | head -1)`',
      'With `set -o pipefail`, a failed ssh makes the whole pipeline fail - check it, and check `[ -n "$latest" ]`.',
      '`scp "$host:$latest" "$dest/"` and print `$dest/$(basename "$latest")`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

host="\${1:?usage: fetch_backup.sh HOST DEST}"
dest="\${2:?usage: fetch_backup.sh HOST DEST}"

if ! latest=$(ssh -n -o BatchMode=yes -o ConnectTimeout=5 "$host" 'ls -1t /backups/*.tar.gz' 2>/dev/null | head -1) || [ -z "$latest" ]; then
  echo "error: no backups found on $host (or ssh failed)" >&2
  exit 1
fi

mkdir -p "$dest"
scp -q "$host:$latest" "$dest/"
echo "$dest/$(basename "$latest")"`,
    ],
    explanation: [
      {
        code: "ssh ... 'ls -1t /backups/*.tar.gz'",
        note: 'Single quotes: the glob is expanded on the remote side. -t sorts newest first.',
      },
      { code: '| head -1', note: 'Just the newest.' },
      {
        code: 'if ! latest=$(...) || [ -z "$latest" ]',
        note: 'With pipefail the assignment fails if ssh failed; also handle "nothing found".',
      },
      {
        code: 'scp -q "$host:$latest" "$dest/"',
        note: 'Copy into the directory, keeping the file name.',
      },
    ],
    checks: [
      { kind: 'files', dir: '/restore', label: '/restore' },
      { kind: 'output', mode: 'exact', label: 'Printed path' },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: {
      name: 'fetch_backup.sh',
      cases: [
        {
          label: 'Backup server',
          args: { main: ['bkp-01', '/restore'], hidden: ['bkp-11', '/restore'] },
        },
        {
          label: 'Host with SSH auth failure',
          args: { main: ['db-01', '/restore'], hidden: ['app-11', '/restore'] },
        },
      ],
    },
    hiddenVariant: 'A different backup host, and a different host with an SSH auth failure.',
    followUp: 'How would you verify the copy is intact before restoring it?',
    repoRef: null,
    tags: ['ssh', 'scp'],
  },
  {
    id: 'url-check',
    title: 'Script: health-check a list of URLs',
    category: 'Network & servers',
    level: 'simple',
    type: 'script',
    scenario: 'You want a quick status board for the public endpoints.',
    task: 'Write **url_check.sh FILE**. For each URL in FILE, get the HTTP status with curl (5 s timeout). Print `OK 200 <url>` when the status is 200, otherwise `FAIL <code> <url>` (curl reports `000` when it gets no response at all). Exit 1 if anything failed.',
    seedFiles: ['/root/endpoints.txt'],
    mockHosts: ['Mock domains: 200, 503, 404, expired cert, no DNS'],
    hints: [
      '`curl -s -o /dev/null -w \'%{http_code}\' --max-time 5 "$url"` prints only the status code.',
      'When curl fails it still prints `000` but exits non-zero - add `|| true` if you use set -e.',
      'Keep a `failed=1` flag and finish with `exit $failed`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -uo pipefail

file="\${1:?usage: url_check.sh FILE}"
failed=0
while IFS= read -r url; do
  [ -z "$url" ] && continue
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url")
  if [ "$code" = "200" ]; then
    echo "OK $code $url"
  else
    echo "FAIL $code $url"
    failed=1
  fi
done < "$file"
exit "$failed"`,
    ],
    explanation: [
      {
        code: "-s -o /dev/null -w '%{http_code}'",
        note: 'Silent, discard the body, print just the status code.',
      },
      { code: '--max-time 5', note: 'Never hang on a dead endpoint.' },
      { code: '[ "$code" = "200" ]', note: 'Compare as a string - "000" is not a useful number.' },
      { code: 'exit "$failed"', note: 'Lets a monitor or CI job act on the result.' },
    ],
    checks: [
      { kind: 'output', mode: 'exact', label: 'Report' },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: {
      name: 'url_check.sh',
      cases: [{ label: 'Endpoints', args: ['/root/endpoints.txt'] }],
    },
    hiddenVariant: 'Different domains with different failures.',
    followUp:
      'Why does an expired certificate show up as 000 here, and what does `curl -k` change?',
    repoRef: null,
    tags: ['curl', 'http'],
  },
  {
    id: 'port-443',
    title: 'Is anything listening on 443?',
    category: 'Network & servers',
    level: 'simple',
    type: 'command',
    scenario: 'HTTPS is down. First question: is anything listening at all?',
    task: 'Print **LISTENING** if a process is listening on TCP port **443** on this machine, otherwise **NOT LISTENING**.',
    seedFiles: [],
    mockHosts: ['ss'],
    hints: [
      '`ss -ltn` lists listening TCP sockets with numeric ports.',
      'grep for `:443 ` (with the colon) - `443` alone also matches 4430.',
      "`ss -ltn | grep -q ':443 ' && echo LISTENING || echo NOT LISTENING`",
    ],
    solutions: [
      "ss -ltn | grep -q ':443 ' && echo LISTENING || echo 'NOT LISTENING'",
      "if ss -ltn | awk '{print $4}' | grep -q ':443$'; then echo LISTENING; else echo 'NOT LISTENING'; fi",
    ],
    explanation: [
      { code: 'ss -ltn', note: '-l listening, -t TCP, -n numeric ports (no service names).' },
      {
        code: "grep -q ':443 '",
        note: 'Quiet: only the exit status. The colon and space anchor the port.',
      },
      {
        code: '&& echo LISTENING || echo NOT LISTENING',
        note: 'Pick a message from the exit status.',
      },
    ],
    checks: [{ kind: 'output', mode: 'exact', label: 'Result' }],
    hiddenVariant: 'Nothing listens on 443.',
    followUp: 'Something is listening on 443 but curl from another host times out. What next?',
    repoRef: null,
    tags: ['ss', 'grep'],
  },
  {
    id: 'dns-check',
    title: 'Check DNS for a list of names',
    category: 'Network & servers',
    level: 'simple',
    type: 'command',
    scenario: 'After a DNS migration you want to confirm every name still resolves.',
    task: 'For each name in **/root/domains.txt**, print `<name> OK <ip>` if it resolves, or `<name> FAILED` if not.',
    seedFiles: ['/root/domains.txt'],
    mockHosts: ['getent / nslookup / dig'],
    hints: [
      '`getent hosts NAME` prints `IP NAME` and exits non-zero if the name does not resolve.',
      "Take the IP with `awk '{print $1}'`.",
      'Loop with `while read -r d; do ... done < /root/domains.txt`.',
    ],
    solutions: [
      `while read -r d; do
  ip=$(getent hosts "$d" | awk '{print $1}')
  if [ -n "$ip" ]; then echo "$d OK $ip"; else echo "$d FAILED"; fi
done < /root/domains.txt`,
      `while read -r d; do ip=$(dig +short "$d" | head -1); [ -n "$ip" ] && echo "$d OK $ip" || echo "$d FAILED"; done < /root/domains.txt`,
    ],
    explanation: [
      {
        code: 'getent hosts "$d"',
        note: 'Resolves the way applications do (via /etc/nsswitch.conf: /etc/hosts, then DNS).',
      },
      { code: "awk '{print $1}'", note: 'The IP is the first field.' },
      { code: '[ -n "$ip" ]', note: 'Empty means it did not resolve.' },
    ],
    checks: [{ kind: 'output', mode: 'exact', label: 'Results' }],
    hiddenVariant: 'Different names; a different one does not resolve.',
    followUp: 'dig resolves a name but the app cannot. What could cause that?',
    repoRef: null,
    tags: ['dns', 'getent'],
  },
  {
    id: 'cert-expiry',
    title: 'Script: days until certificates expire',
    category: 'Network & servers',
    level: 'medium',
    type: 'script',
    scenario: 'An expired certificate took the shop down last year. Never again.',
    task: 'Write **cert_check.sh FILE**. For each domain in FILE, read its certificate’s end date with `openssl s_client` + `openssl x509 -enddate`, and compute the days left as `$(( (end - now) / 86400 ))` (seconds since the epoch via `date -d ... +%s`). Print `OK <domain> <days>` or, if fewer than 30 days are left (including expired), `WARN <domain> <days>`. If no certificate can be read, print `ERROR <domain>`. Exit 1 if there was any WARN or ERROR.',
    seedFiles: ['/root/domains.txt'],
    mockHosts: ['Mock domains with certificates (one expired, one soon)'],
    hints: [
      '`echo | openssl s_client -connect "$d:443" -servername "$d" 2>/dev/null | openssl x509 -noout -enddate` prints `notAfter=Oct 16 12:00:00 2026 GMT`.',
      'Strip the prefix with `cut -d= -f2` (or `${end#notAfter=}`), then `end=$(date -d "$enddate" +%s)` and `now=$(date +%s)`.',
      'If the end date is empty, print ERROR and `continue`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -uo pipefail

file="\${1:?usage: cert_check.sh FILE}"
status=0
now=$(date +%s)

while IFS= read -r d; do
  [ -z "$d" ] && continue
  enddate=$(echo | openssl s_client -connect "$d:443" -servername "$d" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -z "$enddate" ]; then
    echo "ERROR $d"
    status=1
    continue
  fi
  end=$(date -d "$enddate" +%s)
  days=$(( (end - now) / 86400 ))
  if (( days < 30 )); then
    echo "WARN $d $days"
    status=1
  else
    echo "OK $d $days"
  fi
done < "$file"
exit "$status"`,
    ],
    explanation: [
      {
        code: 'echo | openssl s_client -connect "$d:443" -servername "$d"',
        note: 'Connect and print the server certificate. `echo |` closes the session; -servername sends SNI.',
      },
      {
        code: 'openssl x509 -noout -enddate',
        note: 'Read the certificate from stdin and print only notAfter=...',
      },
      { code: 'cut -d= -f2', note: 'Keep the date.' },
      {
        code: 'date -d "$enddate" +%s',
        note: 'Convert to seconds since 1970 so you can subtract.',
      },
      { code: '$(( (end - now) / 86400 ))', note: 'Seconds → whole days (integer division).' },
      {
        code: '(( days < 30 ))',
        note: 'Arithmetic test. Expired certs have negative days, so they warn too.',
      },
    ],
    checks: [
      { kind: 'output', mode: 'exact', label: 'Report' },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: { name: 'cert_check.sh', cases: [{ label: 'Domains', args: ['/root/domains.txt'] }] },
    hiddenVariant: 'Different domains and expiry dates.',
    followUp:
      'How would you check a certificate file on disk instead, and what does `openssl x509 -checkend 2592000` do?',
    repoRef: null,
    tags: ['openssl', 'date', 'tls'],
  },
  {
    id: 'ensure-nginx',
    title: 'Script: make sure nginx is running',
    category: 'Network & servers',
    level: 'simple',
    type: 'script',
    scenario: 'nginx occasionally dies after a bad config reload. You want a cron-safe guard.',
    task: 'Write **ensure_nginx.sh**: if nginx is not active, restart it and print `nginx restarted`; if it is active, print `nginx is running` and do nothing else. Exit 1 if the restart fails.',
    seedFiles: [],
    mockHosts: ['systemctl (nginx)'],
    hints: [
      '`systemctl is-active --quiet nginx` prints nothing and exits 0 only when active.',
      'Use `if ! ...; then ...; fi`.',
      '`systemctl restart nginx || exit 1`',
    ],
    solutions: [
      `#!/usr/bin/env bash
if systemctl is-active --quiet nginx; then
  echo "nginx is running"
else
  systemctl restart nginx || exit 1
  echo "nginx restarted"
fi`,
    ],
    explanation: [
      {
        code: 'systemctl is-active --quiet nginx',
        note: 'Exit status 0 = active. --quiet suppresses the printed state.',
      },
      {
        code: 'systemctl restart nginx || exit 1',
        note: 'Stop with an error if the restart fails.',
      },
    ],
    checks: [
      {
        kind: 'probe',
        command: 'systemctl is-active nginx',
        mode: 'exact',
        label: 'nginx afterwards',
      },
      { kind: 'output', mode: 'exact', label: 'Message' },
      { kind: 'exit', label: 'Exit status' },
    ],
    script: { name: 'ensure_nginx.sh', cases: [{ label: 'Run', args: [] }] },
    hiddenVariant: 'nginx is already running.',
    followUp:
      'Restarting blindly can hide a broken config. What would you run before restarting, and what does systemd’s Restart=on-failure give you?',
    repoRef: null,
    tags: ['systemctl'],
  },
  {
    id: 'heal-service',
    title: 'Script: restart a failed service and alert',
    category: 'Network & servers',
    level: 'medium',
    type: 'script',
    scenario:
      'The payments service sometimes crashes. You want self-healing - but people must know when it happens.',
    task: 'Write **heal.sh SERVICE**. If SERVICE is active, print `SERVICE is active` and exit 0. Otherwise restart it and check again. If it is now active, email **ops@example.com** with a subject containing `SERVICE restarted` and exit 0. If it is still not active, email a subject containing `SERVICE restart FAILED` and exit 1.',
    seedFiles: [],
    mockHosts: ['systemctl', 'mail (→ Outbox)'],
    hints: [
      'Check with `systemctl is-active --quiet "$svc"`.',
      'The restart itself may fail: `systemctl restart "$svc" || true`, then check again.',
      'Use `$(hostname)` in the subject: `mail -s "$svc restarted on $(hostname)" ops@example.com <<< "..."`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -uo pipefail

svc="\${1:?usage: heal.sh SERVICE}"

if systemctl is-active --quiet "$svc"; then
  echo "$svc is active"
  exit 0
fi

systemctl restart "$svc" 2>/dev/null || true
sleep 2

if systemctl is-active --quiet "$svc"; then
  echo "$svc was down and has been restarted" | mail -s "$svc restarted on $(hostname)" ops@example.com
  exit 0
fi

systemctl status "$svc" 2>&1 | mail -s "$svc restart FAILED on $(hostname)" ops@example.com
exit 1`,
    ],
    explanation: [
      { code: 'systemctl is-active --quiet "$svc"', note: 'Nothing to do when it already runs.' },
      {
        code: 'systemctl restart "$svc" 2>/dev/null || true',
        note: 'Try; a failed restart is handled by the second check.',
      },
      { code: 'sleep 2', note: 'Give it a moment to start (or crash again).' },
      {
        code: 'systemctl status "$svc" 2>&1 | mail -s "... FAILED ..."',
        note: 'Include the status output in the alert to save the on-call a step.',
      },
    ],
    checks: [
      {
        kind: 'probe',
        command: 'systemctl is-active payments',
        mode: 'exact',
        label: 'payments afterwards',
      },
      { kind: 'outbox', channel: 'mail', pattern: '\\w+ restart(?:ed| FAILED)', label: 'Alert' },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'heal.sh',
      cases: [
        { label: 'Failed service', args: ['payments'] },
        { label: 'Healthy service', args: ['cron'] },
      ],
    },
    hiddenVariant: 'The restart fails, so the script must report FAILED and exit 1.',
    followUp:
      'If this runs every minute and the service keeps crashing, ops gets 60 emails an hour. How would you add a back-off?',
    repoRef: null,
    tags: ['systemctl', 'mail'],
  },
]
