import type { K8sScenario } from '../types'
import { SHOP_ACR, image, nodeService } from './apps'

const DAY = 24 * 3600

export const rolloutScenarios: K8sScenario[] = [
  {
    id: 'bad-rollout-undo',
    title: 'Bad release: roll back now, debug later',
    category: 'Rollouts',
    level: 'simple',
    story:
      'Release **1.9.0** of `cart` went out 15 minutes ago. The new Pods crash on start-up, the rollout has stalled half-way, and the cart is running on reduced capacity. The developers need an hour to find the bug.',
    task: "Restore Deployment `cart` (namespace `cart`) to the **last working release** with all 4 replicas, using the Deployment's own history - not by editing manifests.",
    symptom:
      'Two new Pods in `CrashLoopBackOff`, three old Pods serving; `kubectl rollout status` never finishes.',
    hints: [
      '`kubectl rollout history deployment/cart` lists the revisions and their change causes.',
      'Check why 1.9.0 fails (`kubectl logs` on a new Pod) - but first restore service.',
      '`kubectl rollout undo deployment/cart`',
    ],
    solution: { commands: ['kubectl rollout undo deployment/cart'] },
    explanation: [
      {
        code: 'kubectl rollout status deployment/cart',
        note: "Stuck: the new ReplicaSet's Pods never become Ready, so the rolling update stops with old Pods still running - Kubernetes never rolls back by itself.",
      },
      {
        code: 'kubectl logs <new-pod> --previous',
        note: '`missing required environment variable FEATURE_FLAGS_URL` - 1.9.0 needs config that was never added.',
      },
      {
        code: 'kubectl rollout history deployment/cart',
        note: 'Revision 1 = 1.8.0, revision 2 = 1.9.0.',
      },
      {
        code: 'kubectl rollout undo deployment/cart',
        note: "Copies revision 1's Pod template back into the Deployment (it becomes revision 3) and scales the old ReplicaSet back up.",
      },
    ],
    wrongFix: {
      commands: ['kubectl rollout restart deployment/cart'],
      why: 'A restart re-creates Pods from the current (broken 1.9.0) template.',
    },
    checks: [
      { kind: 'rollout', deployment: 'cart' },
      {
        kind: 'image',
        deployment: 'cart',
        container: 'cart',
        repo: 'acrshoplab.azurecr.io/cart/cart',
        tag: '1.8.0',
      },
      { kind: 'replicas', deployment: 'cart', count: 4 },
      { kind: 'endpoints', service: 'cart', deployment: 'cart' },
    ],
    rootCause: {
      question: 'What went wrong with 1.9.0?',
      options: [
        {
          text: 'Version 1.9.0 needs a new environment variable (FEATURE_FLAGS_URL) that the Deployment does not set, so it exits on start-up and the rollout stalls.',
          correct: true,
          why: "The new Pods' logs say so, and 1.8.0 runs fine with the same config.",
        },
        {
          text: 'Kubernetes rolled back automatically, but only half-way.',
          why: 'Deployments never roll back on their own; they stop progressing (ProgressDeadlineExceeded).',
        },
        {
          text: 'The 1.9.0 image is missing from the registry.',
          why: 'That would be ImagePullBackOff. These containers start and exit with code 1.',
        },
        {
          text: 'The new Pods run out of memory.',
          why: 'That is exit code 137/OOMKilled; here it is exit 1 with a clear message.',
        },
      ],
    },
    lesson:
      'Mitigate first, then debug: `rollout undo` restores the previous template in seconds. Readiness probes and `maxUnavailable` are what kept the old Pods serving during the bad rollout. Then fix forward with the missing config.',
    followUp:
      'How would you make this release fail automatically in the pipeline instead (progressDeadlineSeconds, `rollout status` exit codes, canaries)?',
    tags: ['rollout', 'undo', 'history', 'crashloopbackoff', 'rollback'],
    related: ['itv-myk8s-54', 'itv-myk8s-49', 'itv-k8s-53', 'itv-k8s-23'],
    setup: {
      namespace: 'cart',
      age: 3 * DAY,
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/cart/cart',
          ['1.8.0', '1.9.0'],
          nodeService('cart', { port: 8080, version: '1.8.0' }),
          {
            '1.9.0': nodeService('cart', {
              port: 8080,
              version: '1.9.0',
              requiredEnv: ['FEATURE_FLAGS_URL'],
            }),
          },
        ),
      ],
      timeline: [
        {
          at: 3 * DAY - 905,
          command:
            'kubectl annotate deployment cart kubernetes.io/change-cause="Release 1.9.0 (CHG-5120)" --overwrite',
        },
        {
          at: 3 * DAY - 900,
          command: 'kubectl set image deployment/cart cart=acrshoplab.azurecr.io/cart/cart:1.9.0',
        },
      ],
      manifests: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cart
  labels:
    app: cart
  annotations:
    kubernetes.io/change-cause: Release 1.8.0 (CHG-5002)
spec:
  replicas: 4
  selector:
    matchLabels:
      app: cart
  template:
    metadata:
      labels:
        app: cart
    spec:
      containers:
        - name: cart
          image: acrshoplab.azurecr.io/cart/cart:1.8.0
          ports:
            - name: http
              containerPort: 8080
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
---
apiVersion: v1
kind: Service
metadata:
  name: cart
spec:
  selector:
    app: cart
  ports:
    - port: 80
      targetPort: http
`,
    },
  },
]
