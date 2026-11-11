import type { K8sScenario } from '../types'
import { SHOP_ACR, image, nodeService } from './apps'

export const probeScenarios: K8sScenario[] = [
  {
    id: 'liveness-wrong-port',
    title: 'Healthy app, killed every minute',
    category: 'Health probes',
    level: 'medium',
    story:
      'The `catalog` service was moved to a new base chart that adds health probes. Since then its Pods restart roughly every 40 seconds. The developers swear the app is fine - and its logs agree: it starts, serves traffic, then shuts down cleanly because "SIGTERM received".',
    task: 'Stop the restarts of Deployment `catalog` (namespace `catalog`). **Keep a liveness probe** - it must check the app properly, not be deleted or delayed into uselessness.',
    symptom:
      '`kubectl get pods` shows `Running` with RESTARTS climbing (and the odd `CrashLoopBackOff`); users see occasional errors.',
    hints: [
      'Who is sending SIGTERM? Look at the **Events** in `kubectl describe pod`.',
      "The liveness probe fails with `connection refused`. Compare the probe's port with the port the app logs that it listens on (`kubectl logs`) and with `containerPort`.",
      '`kubectl patch deployment catalog --type json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/port","value":8080}]\'`',
    ],
    solution: {
      commands: [
        'kubectl patch deployment catalog --type json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/port","value":8080}]\'',
      ],
    },
    explanation: [
      {
        code: 'kubectl describe pod <pod>',
        note: 'Events: `Liveness probe failed: ... dial tcp 10.244.x.y:8081: connect: connection refused` then `Container catalog failed liveness probe, will be restarted`. Last State is `Completed`, exit 0 - the app did not crash, it was told to stop.',
      },
      {
        code: 'kubectl logs deploy/catalog',
        note: 'The app listens on 8080. Nothing listens on 8081, so every liveness check fails and after 3 failures (30s) the kubelet restarts the container.',
      },
      {
        code: 'kubectl patch ... livenessProbe/httpGet/port ... 8080',
        note: 'Point the probe at the real port. Using the named port (`port: http`) avoids this class of mistake entirely.',
      },
      { code: 'kubectl get pods -w', note: 'Restarts stay at 0 on the new Pods.' },
    ],
    wrongFix: {
      commands: ['kubectl delete pod -l app=catalog'],
      why: 'Fresh Pods have 0 restarts for about 30 seconds - then the same probe kills them again.',
    },
    checks: [
      { kind: 'rollout', deployment: 'catalog' },
      { kind: 'probe', deployment: 'catalog', container: 'catalog', probe: 'livenessProbe' },
      { kind: 'endpoints', service: 'catalog', deployment: 'catalog' },
    ],
    rootCause: {
      question: 'Why were the containers restarting?',
      options: [
        {
          text: 'The liveness probe checks port 8081, where nothing listens, so the kubelet kills a healthy app after three failed checks.',
          correct: true,
          why: '`Liveness probe failed ... connection refused` followed by `Killing` events; the app exits 0 after SIGTERM.',
        },
        {
          text: 'The app crashes under load.',
          why: 'It exits with code 0 after logging SIGTERM - something stopped it. A crash would be a non-zero exit with an error in the logs.',
        },
        {
          text: 'The readiness probe is failing.',
          why: 'Readiness only takes a Pod out of the Service; it never restarts a container.',
        },
        {
          text: 'The node is under memory pressure.',
          why: 'Pressure evicts Pods; it does not restart the same container every 40 seconds with probe events.',
        },
      ],
    },
    lesson:
      'A liveness probe is a kill switch: when it fails, the kubelet restarts the container. Point it at a cheap endpoint on the right port (use the named port), never at dependencies. Readiness decides traffic; liveness decides restarts; startup protects slow starters.',
    followUp:
      'Should a liveness probe check the database connection? What happens to the whole fleet during a database blip if it does?',
    tags: ['liveness', 'probes', 'restarts', 'crashloopbackoff', 'describe'],
    related: ['itv-k8s-5', 'itv-k8s-22', 'itv-myk8s-71'],
    setup: {
      namespace: 'catalog',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/catalog/catalog',
          ['7.1.0'],
          nodeService('catalog', { port: 8080, version: '7.1.0', memory: 160 }),
        ),
      ],
      manifests: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog
  labels:
    app: catalog
spec:
  replicas: 3
  selector:
    matchLabels:
      app: catalog
  template:
    metadata:
      labels:
        app: catalog
    spec:
      containers:
        - name: catalog
          image: acrshoplab.azurecr.io/catalog/catalog:7.1.0
          ports:
            - name: http
              containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8081
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: catalog
spec:
  selector:
    app: catalog
  ports:
    - port: 80
      targetPort: http
`,
    },
  },
  {
    id: 'readiness-wrong-path',
    title: 'Running, but 0/1 Ready and a 503',
    category: 'Health probes',
    level: 'simple',
    story:
      'The accounts team switched their `profile` service to a new web framework. The Pods are up - no crashes, no restarts - yet `https://accounts.example.com/profile` returns **503 Service Temporarily Unavailable**.',
    task: 'Make `http://accounts.example.com/profile` work again by fixing Deployment `profile` (namespace `accounts`). Keep the readiness probe - it must actually check the app.',
    symptom: 'Pods are `Running` with `0/1` READY; the ingress answers 503.',
    hints: [
      'A 503 from the ingress controller usually means the Service behind it has no **ready** endpoints. Check with `kubectl get endpointslices` or `kubectl describe svc profile`.',
      'Why are the Pods not Ready? `kubectl describe pod` shows the readiness probe result. Which paths does the app answer? Try `kubectl exec deploy/profile -- curl -s -i localhost:8080/readyz` and `/ready`.',
      '`kubectl patch deployment profile --type json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/ready"}]\'`',
    ],
    solution: {
      commands: [
        'kubectl patch deployment profile --type json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/ready"}]\'',
      ],
    },
    explanation: [
      {
        code: 'curl -i http://accounts.example.com/profile',
        note: '503 from nginx: the controller found the Ingress rule but no ready backend.',
      },
      {
        code: 'kubectl describe svc profile',
        note: '`Endpoints:` is empty although the selector matches the Pods - they are selected but not Ready.',
      },
      {
        code: 'kubectl describe pod <pod>',
        note: '`Readiness probe failed: HTTP probe failed with statuscode: 404` - the new framework serves `/ready`, not `/readyz`.',
      },
      {
        code: 'kubectl patch ... readinessProbe/httpGet/path ... /ready',
        note: 'The new Pods pass the probe, join the endpoints, and the ingress starts routing.',
      },
    ],
    wrongFix: {
      commands: ['kubectl rollout restart deployment/profile'],
      why: 'Restarted Pods run the same probe against the same 404.',
    },
    checks: [
      { kind: 'rollout', deployment: 'profile' },
      { kind: 'probe', deployment: 'profile', container: 'profile', probe: 'readinessProbe' },
      { kind: 'endpoints', service: 'profile', deployment: 'profile' },
      { kind: 'http', url: 'http://accounts.example.com/profile', status: 200 },
    ],
    rootCause: {
      question: 'Why did the ingress return 503?',
      options: [
        {
          text: 'The readiness probe asks for `/readyz`, the app returns 404, so no Pod is Ready and the Service has no endpoints.',
          correct: true,
          why: 'The probe events show 404, READY is 0/1, and endpoints are empty while the selector matches.',
        },
        {
          text: 'The Service selector does not match the Pods.',
          why: 'It does - the Pods are listed as not-ready addresses. A selector mismatch leaves them out entirely.',
        },
        {
          text: 'The app crashes on every request.',
          why: 'There are no restarts and the app answers `/ready` and `/profile` from inside the Pod.',
        },
        {
          text: 'The Ingress has no ingressClassName.',
          why: 'Then nginx would answer 404 from its default backend and the Ingress would have no ADDRESS. 503 means it matched the rule.',
        },
      ],
    },
    lesson:
      'Readiness gates traffic: a Pod that is Running but not Ready gets no requests from Services or Ingresses. When an ingress says 503, walk the chain backwards: Ingress → Service → endpoints → Pod readiness → probe events.',
    followUp:
      'During a deploy, how do readiness probes, `maxUnavailable` and a preStop hook work together to give zero-downtime rollouts?',
    tags: ['readiness', 'probes', 'endpoints', '503', 'ingress'],
    related: ['itv-k8s-22', 'itv-myk8s-72', 'itv-k8s-5'],
    setup: {
      namespace: 'accounts',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/accounts/profile',
          ['3.0.0'],
          nodeService('profile', {
            port: 8080,
            version: '3.0.0',
            routes: { '/profile': '{"user":"demo","plan":"pro"}' },
          }),
        ),
      ],
      manifests: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: profile
  labels:
    app: profile
spec:
  replicas: 2
  selector:
    matchLabels:
      app: profile
  template:
    metadata:
      labels:
        app: profile
    spec:
      containers:
        - name: profile
          image: acrshoplab.azurecr.io/accounts/profile:3.0.0
          ports:
            - name: http
              containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 192Mi
            limits:
              memory: 384Mi
          readinessProbe:
            httpGet:
              path: /readyz
              port: http
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: profile
spec:
  selector:
    app: profile
  ports:
    - port: 80
      targetPort: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: accounts
spec:
  ingressClassName: nginx
  rules:
    - host: accounts.example.com
      http:
        paths:
          - path: /profile
            pathType: Prefix
            backend:
              service:
                name: profile
                port:
                  number: 80
`,
    },
  },
]
