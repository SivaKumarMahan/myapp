import type { LabChallenge } from '../types'

export const textChallenges: LabChallenge[] = [
  {
    id: 'bash-users',
    title: 'Users with a bash login shell',
    category: 'Text processing',
    level: 'simple',
    type: 'command',
    scenario: 'An audit asks which accounts can log in with an interactive bash shell.',
    task: 'Print the usernames from **/etc/passwd** whose login shell is exactly **/bin/bash**.',
    seedFiles: ['/etc/passwd'],
    hints: [
      '/etc/passwd has 7 fields separated by `:`; the shell is the last one.',
      'awk can split on `:` with `-F:`.',
      '`awk -F: \'$7 == "/bin/bash" {print $1}\' /etc/passwd`',
    ],
    solutions: [
      `awk -F: '$7 == "/bin/bash" {print $1}' /etc/passwd`,
      "grep ':/bin/bash$' /etc/passwd | cut -d: -f1",
    ],
    explanation: [
      { code: 'awk -F:', note: 'Split each line on colons.' },
      {
        code: '$7 == "/bin/bash"',
        note: 'Field 7 is the login shell. An exact match skips /bin/sh and nologin.',
      },
      { code: '{print $1}', note: 'Field 1 is the username.' },
    ],
    checks: [{ kind: 'output', mode: 'unordered', label: 'Users' }],
    hiddenVariant: 'Different users, and one more with /bin/bash.',
    followUp:
      'Why is getent passwd better than reading /etc/passwd on a machine joined to LDAP or AD?',
    repoRef: null,
    tags: ['awk', 'passwd'],
  },
  {
    id: 'sed-port',
    title: 'Change a config value in place, with a backup',
    category: 'Text processing',
    level: 'simple',
    type: 'command',
    scenario: 'The app has to move from port 8080 to 9090.',
    task: 'In **/etc/app/app.conf**, change the line `port=8080` to `port=9090` **in place**, keeping a backup of the original as **/etc/app/app.conf.bak**. Change nothing else.',
    seedFiles: ['/etc/app/app.conf'],
    hints: [
      '`sed -i` edits a file in place; `-i.bak` keeps a copy with that suffix.',
      'Anchor the pattern so `metrics_port=8080` is not touched: `^port=8080$`.',
      "`sed -i.bak 's/^port=8080$/port=9090/' /etc/app/app.conf`",
    ],
    solutions: [
      "sed -i.bak 's/^port=8080$/port=9090/' /etc/app/app.conf",
      "cp /etc/app/app.conf /etc/app/app.conf.bak && sed -i 's/^port=8080$/port=9090/' /etc/app/app.conf",
    ],
    explanation: [
      { code: 'sed -i.bak', note: 'Edit in place and save the original as app.conf.bak.' },
      {
        code: "'s/^port=8080$/port=9090/'",
        note: '^ and $ anchor the whole line, so metrics_port=8080 stays as it is.',
      },
    ],
    checks: [
      { kind: 'file', path: '/etc/app/app.conf', label: 'app.conf' },
      { kind: 'file', path: '/etc/app/app.conf.bak', label: 'Backup' },
    ],
    hiddenVariant: 'The config also has metrics_port=8080, which must not change.',
    followUp:
      'How would you make the change only if the file still says 8080, and report whether anything changed?',
    repoRef: null,
    tags: ['sed'],
  },
  {
    id: 'csv-admins',
    title: 'Admins from a CSV',
    category: 'Text processing',
    level: 'simple',
    type: 'command',
    scenario: 'HR exported users to a CSV and you need the admin accounts.',
    task: 'From **/root/users.csv** (header `username,email,role`), print the **usernames** of everyone whose role is **admin**.',
    seedFiles: ['/root/users.csv'],
    hints: [
      'Split on commas with `-F,`.',
      'Skip the header with `NR > 1`.',
      '`awk -F, \'NR > 1 && $3 == "admin" {print $1}\' /root/users.csv`',
    ],
    solutions: [
      `awk -F, 'NR > 1 && $3 == "admin" {print $1}' /root/users.csv`,
      "tail -n +2 /root/users.csv | grep ',admin$' | cut -d, -f1",
    ],
    explanation: [
      { code: 'awk -F,', note: 'Comma-separated fields.' },
      { code: 'NR > 1', note: 'Skip the header row.' },
      { code: '$3 == "admin"', note: 'Exact match on the role column.' },
    ],
    checks: [{ kind: 'output', mode: 'unordered', label: 'Admins' }],
    hiddenVariant: 'Different users and more admins.',
    followUp:
      'What breaks if a field contains a quoted comma, like "Smith, Jane"? What would you use instead?',
    repoRef: null,
    tags: ['awk', 'csv'],
  },
  {
    id: 'dedupe-keep-order',
    title: 'Remove duplicates, keep the order',
    category: 'Text processing',
    level: 'simple',
    type: 'command',
    scenario: 'A host list has duplicates, and its order matters (it is the deploy order).',
    task: 'Print **/root/hosts.txt** without duplicate lines, **keeping the first occurrence and the original order**.',
    seedFiles: ['/root/hosts.txt'],
    hints: [
      '`sort -u` removes duplicates but loses the order.',
      'awk can remember lines it has seen in an array.',
      "`awk '!seen[$0]++' /root/hosts.txt`",
    ],
    solutions: [
      "awk '!seen[$0]++' /root/hosts.txt",
      "awk '!($0 in seen) { seen[$0] = 1; print }' /root/hosts.txt",
    ],
    explanation: [
      {
        code: 'seen[$0]++',
        note: 'Count each line; the value is 0 the first time a line appears.',
      },
      {
        code: '!seen[$0]++',
        note: 'True only on the first occurrence, so awk prints it (the default action).',
      },
    ],
    checks: [{ kind: 'output', mode: 'exact', label: 'Lines' }],
    hiddenVariant: 'Different hosts and duplicates.',
    followUp: 'Why does `uniq` alone not remove all duplicates here?',
    repoRef: null,
    tags: ['awk', 'uniq'],
  },
  {
    id: 'sum-costs',
    title: 'Total the monthly bill',
    category: 'Text processing',
    level: 'simple',
    type: 'command',
    scenario: 'Finance wants last month’s cloud total.',
    task: 'Sum the **cost** column of **/root/billing.csv** (header `service,month,cost`) and print the total with **two decimal places**.',
    seedFiles: ['/root/billing.csv'],
    hints: [
      'Add up field 3 for every row after the header.',
      'Print in the END block.',
      '`awk -F, \'NR > 1 {sum += $3} END {printf "%.2f\\n", sum}\' /root/billing.csv`',
    ],
    solutions: [
      `awk -F, 'NR > 1 {sum += $3} END {printf "%.2f\\n", sum}' /root/billing.csv`,
      `tail -n +2 /root/billing.csv | cut -d, -f3 | awk '{ s += $1 } END { printf "%.2f\\n", s }'`,
    ],
    explanation: [
      { code: 'NR > 1 {sum += $3}', note: 'Add the cost of every data row.' },
      {
        code: 'END {printf "%.2f\\n", sum}',
        note: 'After the last line, print with two decimals.',
      },
    ],
    checks: [{ kind: 'output', mode: 'numbers', label: 'Total' }],
    hiddenVariant: 'Different services and costs.',
    followUp: 'How would you print a total per service if each appears on several rows?',
    repoRef: null,
    tags: ['awk', 'csv'],
  },
  {
    id: 'unmonitored-hosts',
    title: 'Hosts missing from monitoring',
    category: 'Text processing',
    level: 'simple',
    type: 'command',
    scenario: 'Some servers were never added to monitoring.',
    task: 'Print the hosts in **/root/inventory.txt** that are **not** in **/root/monitored.txt**.',
    seedFiles: ['/root/inventory.txt', '/root/monitored.txt'],
    hints: [
      '`comm` compares two **sorted** files line by line.',
      '`comm -23 A B` shows lines only in A.',
      '`comm -23 <(sort /root/inventory.txt) <(sort /root/monitored.txt)`',
    ],
    solutions: [
      'comm -23 <(sort /root/inventory.txt) <(sort /root/monitored.txt)',
      'grep -vxFf /root/monitored.txt /root/inventory.txt',
    ],
    explanation: [
      {
        code: '<(sort file)',
        note: 'Process substitution: the sorted output behaves like a file.',
      },
      {
        code: 'comm -23',
        note: 'comm prints 3 columns (only in A, only in B, in both); -23 hides columns 2 and 3.',
      },
      {
        code: 'grep -vxFf B A',
        note: 'Alternative: lines of A that are not (-v) whole-line (-x) fixed strings (-F) from file B (-f).',
      },
    ],
    checks: [{ kind: 'output', mode: 'unordered', label: 'Unmonitored hosts' }],
    hiddenVariant: 'A different inventory.',
    followUp:
      'How would you show both directions - unmonitored hosts and monitored hosts that no longer exist?',
    repoRef: null,
    tags: ['comm', 'sort'],
  },
]
