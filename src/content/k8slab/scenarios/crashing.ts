import type { K8sScenario } from '../types'
import { SHOP_ACR, image, nodeService, pythonService } from './apps'

export const crashingScenarios: K8sScenario[] = [
  {
    id: 'oom-killed',
    title: 'OOMKilled: exit code 137',
    category: 'Crashing apps',
    level: 'simple',
    story:
      'The nightly reports worker got a new feature: it now pre-builds pivot tables for every tenant at start-up. Since the deploy, its Pods restart over and over and no reports are produced. The logs just stop mid-sentence.',
    task: 'Make Deployment `report-worker` (namespace `analytics`) run stably. Size its **memory** properly - keep a memory limit (no more than 2Gi) and keep 2 replicas.',
    symptom:
      'Pods flip between `OOMKilled` and `CrashLoopBackOff`; the restart count keeps climbing.',
    hints: [
      '`kubectl describe pod` - look at **Last State**: the reason and the exit code tell you who killed the process.',
      'Exit code 137 = 128 + 9 (SIGKILL). With reason `OOMKilled`, the container went over its memory **limit**. How much does it really use? Try `kubectl top pods` while it runs, and compare with `resources` in the Deployment.',
      '`kubectl set resources deployment/report-worker -c worker --requests=memory=640Mi --limits=memory=1Gi`',
    ],
    solution: {
      commands: [
        'kubectl set resources deployment/report-worker -c worker --requests=memory=640Mi --limits=memory=1Gi',
      ],
    },
    explanation: [
      {
        code: 'kubectl describe pod <pod>',
        note: "`Last State: Terminated, Reason: OOMKilled, Exit Code: 137` - the kernel's OOM killer stopped the process when it crossed the cgroup memory limit.",
      },
      {
        code: 'kubectl top pods',
        note: 'Just before it dies the worker sits right at its 256Mi limit; the new feature needs about 600Mi at start-up.',
      },
      {
        code: 'kubectl set resources ... --requests=memory=640Mi --limits=memory=1Gi',
        note: 'The request reserves enough for the scheduler to place it honestly; the limit leaves headroom above real use.',
      },
      { code: 'kubectl get pods -w', note: 'New Pods start and stay up; restarts stay at 0.' },
    ],
    wrongFix: {
      commands: ['kubectl set resources deployment/report-worker -c worker --limits=cpu=1'],
      why: 'CPU is throttled, never OOM-killed. More CPU does not change the memory ceiling.',
    },
    checks: [
      { kind: 'rollout', deployment: 'report-worker' },
      {
        kind: 'memory-limit',
        deployment: 'report-worker',
        container: 'worker',
        min: '650Mi',
        max: '2Gi',
      },
      { kind: 'replicas', deployment: 'report-worker', count: 2 },
      {
        kind: 'image',
        deployment: 'report-worker',
        container: 'worker',
        repo: 'acrshoplab.azurecr.io/analytics/report-worker',
      },
    ],
    rootCause: {
      question: 'Why do the containers keep dying?',
      options: [
        {
          text: 'The process needs about 600Mi at start-up but its memory limit is 256Mi, so the kernel OOM killer kills it (exit 137).',
          correct: true,
          why: '`OOMKilled` with exit code 137 in Last State, and usage pinned at the limit right before each kill.',
        },
        {
          text: 'The node ran out of memory and evicted the Pods.',
          why: 'Node pressure evicts a Pod (status `Evicted`, a new Pod is created). Here the same container restarts in place with reason OOMKilled.',
        },
        {
          text: 'The worker is CPU-throttled and times out.',
          why: 'CPU limits slow a process down; they never kill it. Exit 137 with OOMKilled is memory.',
        },
        {
          text: 'A liveness probe kills the slow start-up.',
          why: 'There is no liveness probe, and a probe kill shows `Killing ... failed liveness probe` events and exit code 0/143, not OOMKilled.',
        },
      ],
    },
    lesson:
      'Memory is not compressible: cross the limit and the kernel kills you. Set the request to what the app really needs (measure it with `kubectl top` or your metrics) and the limit with headroom above that. `OOMKilled` + 137 = limit too low or a leak - the logs, which stop mid-way, will not tell you.',
    followUp:
      'The app has a slow memory leak instead: it starts at 300Mi and grows 50Mi an hour. What changes in your diagnosis and in your fix?',
    tags: ['oomkilled', 'memory', 'limits', 'requests', 'crashloopbackoff', 'top'],
    related: ['itv-myk8s-69', 'itv-myk8s-70', 'itv-k8s-52', 'itv-k8s-6'],
    setup: {
      namespace: 'analytics',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/analytics/report-worker',
          ['4.2.0', '4.3.0'],
          pythonService('report-worker', 'reports.worker', {
            port: null,
            version: '4.3.0',
            memory: 610,
            cpu: 180,
            logs: [
              'INFO:reports.worker:Connected to queue reports-nightly',
              'INFO:reports.worker:Loading report templates (148 files)',
              'INFO:reports.worker:Pre-building pivot tables for 37 tenants...',
              'INFO:reports.worker:tenant 1/37 contoso-eu: 41.2 MiB',
              'INFO:reports.worker:tenant 2/37 fabrikam: 58.9 MiB',
              'INFO:reports.worker:tenant 3/37 northwind: 77.0 MiB',
              'INFO:reports.worker:Ready - waiting for jobs',
            ],
          }),
        ),
      ],
      manifests: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-worker
  labels:
    app: report-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: report-worker
  template:
    metadata:
      labels:
        app: report-worker
    spec:
      containers:
        - name: worker
          image: acrshoplab.azurecr.io/analytics/report-worker:4.3.0
          resources:
            requests:
              cpu: 200m
              memory: 128Mi
            limits:
              memory: 256Mi
`,
    },
  },
  {
    id: 'bad-command',
    title: 'CrashLoopBackOff: Cannot find module',
    category: 'Crashing apps',
    level: 'simple',
    story:
      'A brand-new `notifier` service goes live today. The image works on the developer\'s laptop (`docker run` starts it fine), but in the cluster every Pod crashes within a second. Someone "made the start command explicit" in the manifest. The image\'s Dockerfile ends with `CMD ["node", "dist/server.js"]`.',
    task: 'Get Deployment `notifier` (namespace `notifications`) running, using the **same image**.',
    symptom: 'Pods in `CrashLoopBackOff`, restarts climbing, exit code 1.',
    hints: [
      'A crashing container has logs. Read them: `kubectl logs deploy/notifier` (or `--previous` for the last attempt).',
      "Which file does Node try to load? Compare the `command` in the Deployment with the image's `CMD`. Remember: `command` in Kubernetes replaces the image's ENTRYPOINT and `args` replaces CMD.",
      'Drop the override so the image\'s own start command is used: `kubectl patch deployment notifier --type json -p \'[{"op":"remove","path":"/spec/template/spec/containers/0/command"}]\'`',
    ],
    solution: {
      commands: [
        'kubectl patch deployment notifier --type json -p \'[{"op":"remove","path":"/spec/template/spec/containers/0/command"}]\'',
      ],
    },
    explanation: [
      {
        code: 'kubectl get pods',
        note: '`CrashLoopBackOff` means the process starts and exits; the kubelet waits longer before each restart (10s, 20s, 40s ... up to 5 minutes).',
      },
      {
        code: 'kubectl logs deploy/notifier --previous',
        note: "`Error: Cannot find module '/app/server.js'` - Node was told to run a file that is not in the image.",
      },
      {
        code: 'kubectl get deploy notifier -o yaml',
        note: '`command: ["node", "server.js"]` overrides the image\'s `CMD ["node", "dist/server.js"]`.',
      },
      {
        code: 'kubectl patch ... [{"op":"remove","path":".../command"}]',
        note: 'Removing the override lets the image start the way it was built to. Setting `command: ["node","dist/server.js"]` would also work, but duplicates what the image already knows.',
      },
    ],
    wrongFix: {
      commands: ['kubectl rollout restart deployment/notifier'],
      why: 'A restart runs the same wrong command again.',
    },
    checks: [
      { kind: 'rollout', deployment: 'notifier' },
      {
        kind: 'image',
        deployment: 'notifier',
        container: 'notifier',
        repo: 'acrshoplab.azurecr.io/notifications/notifier',
        tag: '1.0.0',
      },
      { kind: 'endpoints', service: 'notifier', deployment: 'notifier' },
    ],
    rootCause: {
      question: 'Why did every container exit?',
      options: [
        {
          text: "The manifest's `command` overrides the image's start command and points Node at a file that does not exist.",
          correct: true,
          why: "The logs show `Cannot find module '/app/server.js'`; the image ships `dist/server.js`.",
        },
        {
          text: 'The image is corrupt.',
          why: 'It pulled successfully (`Pulled` event) and Node itself started - it just could not find the script.',
        },
        {
          text: 'The container runs out of memory.',
          why: 'That is exit code 137 with reason OOMKilled. Here it is exit code 1 from Node.',
        },
        {
          text: 'A liveness probe restarts it.',
          why: 'There is no probe; the process exits by itself within a second.',
        },
      ],
    },
    lesson:
      'For CrashLoopBackOff, read the logs (`--previous` if the current attempt has not printed yet) and the exit code. `command` replaces ENTRYPOINT, `args` replaces CMD - override them only when you must, and test the exact manifest, not a `docker run` on a laptop.',
    followUp: 'The logs are empty and the exit code is 0. What would you check next?',
    tags: ['crashloopbackoff', 'logs', 'command', 'args', 'entrypoint'],
    related: ['itv-myk8s-61', 'itv-k8s-10', 'itv-k8s-26', 'itv-myk8s-62'],
    setup: {
      namespace: 'notifications',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/notifications/notifier',
          ['1.0.0'],
          nodeService('notifier', {
            port: 3000,
            version: '1.0.0',
            memory: 96,
            logs: ['{"level":"info","msg":"connected to Service Bus queue notifications"}'],
          }),
        ),
      ],
      manifests: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notifier
  labels:
    app: notifier
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notifier
  template:
    metadata:
      labels:
        app: notifier
    spec:
      containers:
        - name: notifier
          image: acrshoplab.azurecr.io/notifications/notifier:1.0.0
          command: ["node", "server.js"]
          ports:
            - name: http
              containerPort: 3000
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: notifier
spec:
  selector:
    app: notifier
  ports:
    - port: 80
      targetPort: http
`,
    },
  },
]
