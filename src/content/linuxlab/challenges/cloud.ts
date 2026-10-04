import type { LabChallenge } from '../types'

const SLACK = 'https://hooks.slack.com/services/T000/B000/XXXX'

export const cloudChallenges: LabChallenge[] = [
  {
    id: 'docker-cleanup',
    title: 'Script: clean up old Docker images',
    category: 'Containers & cloud',
    level: 'medium',
    type: 'script',
    scenario: 'The build agent’s disk is full of old images.',
    task: 'Write **docker_cleanup.sh DAYS**. Remove every image **not used by a running container** that is **older than DAYS days** (dangling and tagged), without a confirmation prompt, and print Docker’s output. If DAYS is missing or not a whole number, print a usage message to stderr and exit 2.',
    seedFiles: [],
    mockHosts: ['docker (images, image prune, rmi)'],
    hints: [
      '`docker image prune` removes dangling images; `-a` removes all unused ones.',
      'Filter by age with `--filter "until=<hours>h"` - convert days to hours with `$((days * 24))`.',
      '`-f` skips the "Are you sure?" prompt (scripts have no one to answer it).',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

days="\${1:-}"
if [[ ! "$days" =~ ^[0-9]+$ ]]; then
  echo "usage: docker_cleanup.sh DAYS" >&2
  exit 2
fi

docker image prune -a -f --filter "until=$((days * 24))h"`,
    ],
    explanation: [
      { code: '[[ ! "$days" =~ ^[0-9]+$ ]]', note: 'Validate before doing anything destructive.' },
      {
        code: 'docker image prune -a',
        note: '-a: every image without a container, not just dangling (<none>) ones. Images in use are never removed.',
      },
      { code: '-f', note: 'No interactive confirmation.' },
      {
        code: '--filter "until=$((days * 24))h"',
        note: 'Only images created more than that many hours ago.',
      },
    ],
    checks: [
      {
        kind: 'probe',
        command: "docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}'",
        mode: 'unordered',
        label: 'Images left',
      },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'docker_cleanup.sh',
      cases: [
        { label: 'Clean up', args: { main: ['30'], hidden: ['14'] } },
        { label: 'Missing DAYS', args: [] },
      ],
    },
    hiddenVariant: 'Different images and a different age limit.',
    followUp:
      'How is this different from `docker system prune`, and what would you never run on a production host?',
    repoRef: null,
    tags: ['docker'],
  },
  {
    id: 'rollout-check',
    title: 'Script: verify a rollout, roll back on failure',
    category: 'Containers & cloud',
    level: 'medium',
    type: 'script',
    scenario:
      'Your pipeline deploys to Kubernetes but never checks that the rollout actually worked.',
    task: `Write **rollout_check.sh DEPLOYMENT [NAMESPACE]** (namespace defaults to \`shop\`). Wait for the rollout with \`kubectl rollout status\` (timeout 120s). On success print \`<deployment> rolled out\` and exit 0. On failure run \`kubectl rollout undo\`, post \`{"text":"Rolled back <deployment> in <namespace>"}\` to the Slack webhook \`${SLACK}\`, and exit 1.`,
    seedFiles: [],
    mockHosts: ['kubectl', 'curl → Slack (Outbox)'],
    hints: [
      '`kubectl rollout status deployment/NAME -n NS --timeout=120s` exits non-zero if the rollout does not finish.',
      'Default an argument with `${2:-shop}`.',
      'Roll back with `kubectl rollout undo deployment/NAME -n NS`.',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -uo pipefail

deploy="\${1:?usage: rollout_check.sh DEPLOYMENT [NAMESPACE]}"
ns="\${2:-shop}"
WEBHOOK="${SLACK}"

if kubectl rollout status "deployment/$deploy" -n "$ns" --timeout=120s; then
  echo "$deploy rolled out"
  exit 0
fi

kubectl rollout undo "deployment/$deploy" -n "$ns"
curl -s -X POST -H 'Content-type: application/json' \\
  -d "{\\"text\\":\\"Rolled back $deploy in $ns\\"}" "$WEBHOOK" > /dev/null
exit 1`,
    ],
    explanation: [
      { code: 'ns="${2:-shop}"', note: 'Optional second argument with a default.' },
      {
        code: 'kubectl rollout status ... --timeout=120s',
        note: 'Blocks until the new pods are ready, or fails after the timeout.',
      },
      { code: 'kubectl rollout undo', note: 'Back to the previous ReplicaSet.' },
      { code: 'curl ... -d "{\\"text\\":...}"', note: 'Tell the team what happened.' },
      { code: 'exit 1', note: 'Fail the pipeline even though the rollback succeeded.' },
    ],
    checks: [
      {
        kind: 'probe',
        command: 'kubectl get deploy -n shop',
        mode: 'unordered',
        label: 'Deployments afterwards',
      },
      {
        kind: 'outbox',
        channel: 'slack',
        pattern: 'Rolled back|\\b(?:api|web)\\b',
        label: 'Slack message',
      },
      { kind: 'exit', exact: true, label: 'Exit status' },
    ],
    script: {
      name: 'rollout_check.sh',
      cases: [
        { label: 'api', args: ['api'] },
        { label: 'web, namespace given', args: ['web', 'shop'] },
      ],
    },
    hiddenVariant: 'web fails and api succeeds.',
    followUp:
      'The rollback succeeded but the pipeline still failed. Is that what you want? How would you get the logs of the failing pods?',
    repoRef: null,
    tags: ['kubectl', 'slack'],
  },
  {
    id: 'az-inventory',
    title: 'Script: Azure resource inventory as CSV',
    category: 'Containers & cloud',
    level: 'medium',
    type: 'script',
    scenario: 'Finance wants a spreadsheet of every Azure resource and who owns it.',
    task: 'Write **az_inventory.sh OUT**. Using `az resource list`, write a CSV to OUT with the header `name,resourceGroup,location,owner` and one row per resource; use `MISSING` when there is no `owner` tag. Then print `Wrote <N> resources to <OUT>`.',
    seedFiles: [],
    mockHosts: ['az (resource list with --query / -o)'],
    hints: [
      '`az resource list -o json` returns an array you can feed to jq.',
      'In jq, `.tags.owner // "MISSING"` gives a default; build rows with `"\\(.name),\\(.resourceGroup),\\(.location),\\(.tags.owner // "MISSING")"`.',
      'Count the data rows with `tail -n +2 "$out" | wc -l` (everything after the header).',
    ],
    solutions: [
      `#!/usr/bin/env bash
set -euo pipefail

out="\${1:?usage: az_inventory.sh OUT}"

echo "name,resourceGroup,location,owner" > "$out"
az resource list -o json \\
  | jq -r '.[] | "\\(.name),\\(.resourceGroup),\\(.location),\\(.tags.owner // "MISSING")"' >> "$out"

count=$(tail -n +2 "$out" | wc -l)
echo "Wrote $count resources to $out"`,
    ],
    explanation: [
      { code: 'az resource list -o json', note: 'Every resource in the subscription as JSON.' },
      { code: '.tags.owner // "MISSING"', note: '// is jq’s "default if null or missing".' },
      { code: '>> "$out"', note: 'Append the rows after the header.' },
      { code: 'count=$(tail -n +2 "$out" | wc -l)', note: 'Count the lines after the header.' },
    ],
    checks: [
      {
        kind: 'probe',
        command: 'cat /root/azure_inventory.csv',
        mode: 'unordered',
        label: '/root/azure_inventory.csv',
      },
      { kind: 'output', mode: 'numbers', label: 'Count' },
    ],
    script: {
      name: 'az_inventory.sh',
      cases: [{ label: 'Inventory', args: ['/root/azure_inventory.csv'] }],
    },
    hiddenVariant: 'A different subscription.',
    followUp: 'How would you get the same CSV with only `--query` and `-o tsv`, without jq?',
    repoRef: null,
    tags: ['az', 'jq', 'csv'],
  },
]
