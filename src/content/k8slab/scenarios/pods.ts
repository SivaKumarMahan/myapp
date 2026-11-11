import type { K8sScenario } from '../types'
import { SHOP_ACR, dockerConfig, image, nodeService } from './apps'

const DAY = 24 * 3600

const storefront = (version: string) =>
  nodeService('storefront', {
    port: 8080,
    version,
    memory: 142,
    routes: { '/products': '{"items":[{"sku":"MUG-01","name":"Lab mug","price":12.5}]}' },
  })

export const podStartScenarios: K8sScenario[] = [
  {
    id: 'image-tag-typo',
    title: 'Release stuck in ImagePullBackOff',
    category: "Pods won't start",
    level: 'simple',
    story:
      'The storefront team shipped release **2.4.1** fifteen minutes ago. The pipeline went green, but the new Pods never started and the rollout is stuck. The old 2.4.0 Pods are still serving, so customers are fine - for now.',
    task: 'Find out why the new Pods of Deployment `storefront` (namespace `shop`) cannot start and get **release 2.4.1** fully rolled out. Do not roll back: 2.4.1 must ship.',
    symptom:
      '`kubectl get pods` shows one Pod in `ErrImagePull` / `ImagePullBackOff`; the rollout has not progressed for 15 minutes.',
    hints: [
      'Look at the **Events** at the bottom of `kubectl describe pod` for the Pod that is not running.',
      'The pull error says the reference is **not found** - so the registry was reached and you were allowed in. Compare the tag with what exists: `az acr repository show-tags --name acrshoplab --repository shop/storefront -o table`.',
      '`kubectl set image deployment/storefront storefront=acrshoplab.azurecr.io/shop/storefront:2.4.1`',
    ],
    solution: {
      commands: [
        'kubectl set image deployment/storefront storefront=acrshoplab.azurecr.io/shop/storefront:2.4.1',
      ],
    },
    explanation: [
      {
        code: 'kubectl get pods',
        note: 'One new Pod is in `ImagePullBackOff` while three old ones keep running - a rolling update that cannot progress.',
      },
      {
        code: 'kubectl describe pod <new-pod>',
        note: 'Events: `Failed to pull image ...storefront:2.41 ... not found`. NotFound (not 401, not a DNS error) means the registry answered: that tag does not exist.',
      },
      {
        code: 'az acr repository show-tags ...',
        note: 'The registry has `2.4.1`; the manifest says `2.41` - a typo in the pipeline variable.',
      },
      {
        code: 'kubectl set image deployment/storefront storefront=...:2.4.1',
        note: 'Changes the Pod template, so the Deployment creates a new ReplicaSet and finishes the rolling update.',
      },
      {
        code: 'kubectl rollout status deployment/storefront',
        note: 'Confirms all replicas are updated and available.',
      },
    ],
    wrongFix: {
      commands: ['kubectl delete pod -l app=storefront'],
      why: 'Deleting Pods only makes the ReplicaSets recreate them from the same template - the typo is still there.',
    },
    checks: [
      { kind: 'rollout', deployment: 'storefront' },
      {
        kind: 'image',
        deployment: 'storefront',
        container: 'storefront',
        repo: 'acrshoplab.azurecr.io/shop/storefront',
        tag: '2.4.1',
      },
      { kind: 'replicas', deployment: 'storefront', count: 3 },
      { kind: 'endpoints', service: 'storefront', deployment: 'storefront' },
      { kind: 'http', url: 'http://shop.example.com/version', status: 200, contains: '2.4.1' },
    ],
    rootCause: {
      question: 'What was the root cause?',
      options: [
        {
          text: 'The image tag `2.41` does not exist in the registry - a typo for `2.4.1`.',
          correct: true,
          why: 'The pull error is `NotFound` for that exact reference, and the registry lists `2.4.1`, not `2.41`.',
        },
        {
          text: 'The cluster lost its AcrPull permission on acrshoplab.',
          why: 'A permission problem shows as `401 Unauthorized`, and the 2.4.0 Pods pulled from the same registry fine.',
        },
        {
          text: 'The nodes cannot reach the registry (DNS or firewall).',
          why: 'That would be `no such host` or a timeout, not a clean `not found` answer from the registry.',
        },
        {
          text: 'Version 2.4.1 crashes on start-up.',
          why: 'The container never started - pulling the image is the step before the process runs.',
        },
      ],
    },
    lesson:
      'Read the pull error word for word: `not found` = wrong name or tag, `401 Unauthorized` = credentials, `no such host` / timeout = network. Pin images by an immutable tag or digest that your pipeline produced, not a hand-typed one.',
    followUp:
      'How would you stop a mistyped tag from reaching the cluster at all? (Think: pipeline outputs the digest, admission policy, `imagePullPolicy`.)',
    tags: ['imagepullbackoff', 'image', 'acr', 'rollout', 'describe'],
    related: ['itv-myk8s-64', 'itv-myk8s-91', 'itv-k8s-10'],
    setup: {
      namespace: 'shop',
      age: 3 * DAY,
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/shop/storefront',
          ['2.3.0', '2.4.0', '2.4.1'],
          storefront('2.4.0'),
          {
            '2.3.0': storefront('2.3.0'),
            '2.4.1': storefront('2.4.1'),
          },
        ),
      ],
      timeline: [
        {
          at: 3 * DAY - 905,
          command:
            'kubectl annotate deployment storefront kubernetes.io/change-cause="Release 2.4.1 (CHG-4471)" --overwrite',
        },
        {
          at: 3 * DAY - 900,
          command:
            'kubectl set image deployment/storefront storefront=acrshoplab.azurecr.io/shop/storefront:2.41',
        },
      ],
      manifests: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storefront
  labels:
    app: storefront
  annotations:
    kubernetes.io/change-cause: Release 2.4.0 (CHG-4398)
spec:
  replicas: 3
  selector:
    matchLabels:
      app: storefront
  template:
    metadata:
      labels:
        app: storefront
    spec:
      containers:
        - name: storefront
          image: acrshoplab.azurecr.io/shop/storefront:2.4.0
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
              path: /ready
              port: http
---
apiVersion: v1
kind: Service
metadata:
  name: storefront
  labels:
    app: storefront
spec:
  selector:
    app: storefront
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: storefront
spec:
  ingressClassName: nginx
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: storefront
                port:
                  number: 80
`,
    },
  },
  {
    id: 'private-registry-secret',
    title: 'ErrImagePull: 401 from a private registry',
    category: "Pods won't start",
    level: 'simple',
    story:
      'The payments team moved their images to their own registry, **acrpayments**, which lives in a separate subscription and is not attached to this cluster. They created a pull secret in the namespace and redeployed `payments-api`. Nothing starts.',
    task: 'Get Deployment `payments-api` (namespace `payments`) running, pulling the **same image from acrpayments**. The registry login is already stored in the namespace - use it.',
    symptom:
      'Both Pods sit in `ErrImagePull` / `ImagePullBackOff`; the internal `payments-api` Service has no endpoints.',
    hints: [
      '`kubectl describe pod` - read the end of the pull error carefully. Is it "not found", or something else?',
      '`401 Unauthorized` means the kubelet pulled anonymously. Which Secrets exist in the namespace (`kubectl get secrets`), and does the Pod spec reference any of them (`kubectl get deploy payments-api -o yaml`)?',
      'Add `imagePullSecrets` to the Pod template: `kubectl patch deployment payments-api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"acr-payments-pull"}]}}}}\'`',
    ],
    solution: {
      commands: [
        'kubectl patch deployment payments-api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"acr-payments-pull"}]}}}}\'',
      ],
    },
    explanation: [
      {
        code: 'kubectl describe pod <pod>',
        note: 'The pull fails with `failed to authorize ... 401 Unauthorized`: the registry exists and answered, but the request had no credentials.',
      },
      {
        code: 'kubectl get secrets',
        note: '`acr-payments-pull` (type `kubernetes.io/dockerconfigjson`) is there - but a Secret does nothing until a Pod (or its ServiceAccount) references it.',
      },
      {
        code: 'kubectl patch deployment payments-api -p \'{"spec":{"template":{"spec":{"imagePullSecrets":[...]}}}}\'',
        note: 'A strategic-merge patch adds `imagePullSecrets` to the Pod template; the new ReplicaSet pulls with those credentials.',
      },
      {
        code: 'kubectl get pods -w',
        note: 'The new Pods pull, start and become Ready; the Service gets endpoints.',
      },
    ],
    wrongFix: {
      commands: ['kubectl rollout restart deployment/payments-api'],
      why: 'Restarting retries the same anonymous pull - it fails the same way.',
    },
    checks: [
      { kind: 'rollout', deployment: 'payments-api' },
      {
        kind: 'image',
        deployment: 'payments-api',
        container: 'api',
        repo: 'acrpayments.azurecr.io/payments/api',
        tag: '3.2.0',
      },
      { kind: 'endpoints', service: 'payments-api', deployment: 'payments-api' },
      { kind: 'http', url: 'http://payments-api.payments/healthz', status: 200, from: 'cluster' },
    ],
    rootCause: {
      question: 'Why could the kubelet not pull the image?',
      options: [
        {
          text: 'The Pods did not reference any pull credentials, so the pull was anonymous and the private registry answered 401.',
          correct: true,
          why: 'The registry is not attached to the cluster, the Secret existed but nothing referenced it, and the error is `401 Unauthorized`.',
        },
        {
          text: 'Tag 3.2.0 was never pushed to acrpayments.',
          why: 'An anonymous request is rejected before the registry reveals whether a tag exists - and with credentials the same tag pulls fine.',
        },
        {
          text: 'The pull secret was created in the wrong namespace.',
          why: '`acr-payments-pull` is in `payments`, next to the Pods. If the Pods had referenced a missing Secret you would also see `FailedToRetrieveImagePullSecret`.',
        },
        {
          text: "A registry firewall blocks the cluster's outbound IP.",
          why: 'A network rule would show as a timeout or `403 ... client with IP ... is not allowed access`, not `401`.',
        },
      ],
    },
    lesson:
      'On AKS prefer the kubelet identity (`az aks update --attach-acr`) for registries you own; use an `imagePullSecret` (on the Pod or the namespace\'s ServiceAccount) for registries you do not. Either way, `401` means "no or wrong credentials", never "missing image".',
    followUp:
      'You have 40 namespaces that all need this registry. Would you add the secret to every Deployment, patch every ServiceAccount, or do something else - and why?',
    tags: ['imagepullbackoff', 'errimagepull', 'imagepullsecrets', 'acr', 'secret'],
    related: ['itv-myk8s-64', 'itv-myk8s-110', 'itv-myk8s-103'],
    setup: {
      namespace: 'payments',
      registries: [
        {
          host: 'acrpayments.azurecr.io',
          anonymous: false,
          kubeletAccess: false,
          username: 'acrpayments-pull',
          password: 'lab-pull-token-not-real',
        },
      ],
      images: [
        image(
          'acrpayments.azurecr.io/payments/api',
          ['3.1.4', '3.2.0'],
          nodeService('payments-api', { port: 8080, version: '3.2.0', memory: 131 }),
        ),
      ],
      manifests: `
apiVersion: v1
kind: Secret
metadata:
  name: acr-payments-pull
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: ${dockerConfig('acrpayments.azurecr.io', 'acrpayments-pull', 'lab-pull-token-not-real')}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  labels:
    app: payments-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
        - name: api
          image: acrpayments.azurecr.io/payments/api:3.2.0
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
              path: /ready
              port: http
---
apiVersion: v1
kind: Service
metadata:
  name: payments-api
spec:
  selector:
    app: payments-api
  ports:
    - name: http
      port: 80
      targetPort: http
`,
    },
  },
  {
    id: 'configmap-missing-key',
    title: 'CreateContainerConfigError after a config change',
    category: "Pods won't start",
    level: 'simple',
    story:
      'Last night the platform team "tidied up" the shared `orders-config` ConfigMap and renamed a few keys to a new convention. This morning the `orders-api` Deployment was redeployed and none of its Pods start.',
    task: "Get Deployment `orders-api` (namespace `orders`) running again. Keep using `orders-config` - don't hard-code values into the Deployment.",
    symptom:
      'Pods are stuck in `CreateContainerConfigError` - not crashing, never starting. The `orders-api` Service has no endpoints.',
    hints: [
      '`kubectl describe pod` - the kubelet says exactly which reference it could not resolve.',
      'Compare the key the Deployment asks for (`kubectl get deploy orders-api -o yaml`, look at `env`) with the keys that exist (`kubectl describe configmap orders-config`).',
      'Point the env var at the renamed key: `kubectl patch deployment orders-api --type json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/env/0/valueFrom/configMapKeyRef/key","value":"DATABASE_HOST"}]\'`',
    ],
    solution: {
      commands: [
        'kubectl patch deployment orders-api --type json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/env/0/valueFrom/configMapKeyRef/key","value":"DATABASE_HOST"}]\'',
      ],
    },
    explanation: [
      {
        code: 'kubectl describe pod <pod>',
        note: "`Error: couldn't find key DB_HOST in ConfigMap orders/orders-config` - the container cannot be created, so there are no logs to read.",
      },
      {
        code: 'kubectl describe configmap orders-config',
        note: 'The key is now `DATABASE_HOST`; `DB_PORT` is unchanged.',
      },
      {
        code: "kubectl patch deployment orders-api --type json -p '[...]'",
        note: 'A JSON patch replaces exactly one field: the `configMapKeyRef.key` of the first env var. (Adding `DB_HOST` back to the ConfigMap would also work - and kubelet would pick it up on its next retry.)',
      },
      {
        code: 'kubectl rollout status deployment/orders-api',
        note: 'New Pods start with `DB_HOST` set from `DATABASE_HOST`.',
      },
    ],
    wrongFix: {
      commands: ['kubectl set env deployment/orders-api DB_HOST-'],
      why: 'Removing the variable makes the container start - and immediately exit, because the app requires `DB_HOST`.',
    },
    checks: [
      { kind: 'rollout', deployment: 'orders-api' },
      { kind: 'exists', resource: 'ConfigMap', name: 'orders-config' },
      { kind: 'endpoints', service: 'orders-api', deployment: 'orders-api' },
      { kind: 'http', url: 'http://orders-api.orders/healthz', status: 200, from: 'cluster' },
    ],
    rootCause: {
      question: 'What stopped the containers from being created?',
      options: [
        {
          text: "An env var references key `DB_HOST`, which no longer exists in the ConfigMap, so the kubelet cannot build the container's environment.",
          correct: true,
          why: 'Non-optional `configMapKeyRef`s are resolved before the container is created; a missing key is `CreateContainerConfigError`.',
        },
        {
          text: 'The `orders-config` ConfigMap was deleted.',
          why: 'It still exists (`kubectl get cm`); a missing ConfigMap would say `configmap "orders-config" not found`.',
        },
        {
          text: 'The app cannot reach its database and crashes on start-up.',
          why: 'The process never ran - there are no logs and no restarts. A crash would be `CrashLoopBackOff`.',
        },
        {
          text: 'The Pods lack RBAC permission to read ConfigMaps.',
          why: 'The kubelet reads ConfigMaps for env vars with its own credentials; Pod RBAC is irrelevant here.',
        },
      ],
    },
    lesson:
      "Config is an API between teams. A non-optional `configMapKeyRef` is a hard dependency: rename a key and every consumer stops at `CreateContainerConfigError`. Version shared config (or roll it out with the app), and look for `couldn't find key` in describe.",
    followUp:
      'If the ConfigMap had been mounted as a volume instead of env vars, what would you have seen - and how do running Pods pick up ConfigMap changes in each case?',
    tags: ['configmap', 'createcontainerconfigerror', 'env', 'patch'],
    related: ['itv-myk8s-63', 'itv-k8s-9', 'itv-k8s-37'],
    setup: {
      namespace: 'orders',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/orders/api',
          ['5.0.2'],
          nodeService('orders-api', {
            port: 8080,
            version: '5.0.2',
            requiredEnv: ['DB_HOST', 'DB_PORT'],
          }),
        ),
      ],
      manifests: `
apiVersion: v1
kind: ConfigMap
metadata:
  name: orders-config
data:
  DATABASE_HOST: orders-db.orders.svc.cluster.local
  DB_PORT: "5432"
  LOG_LEVEL: info
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
  labels:
    app: orders-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
    spec:
      containers:
        - name: api
          image: acrshoplab.azurecr.io/orders/api:5.0.2
          ports:
            - name: http
              containerPort: 8080
          env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: orders-config
                  key: DB_HOST
            - name: DB_PORT
              valueFrom:
                configMapKeyRef:
                  name: orders-config
                  key: DB_PORT
          resources:
            requests:
              cpu: 100m
              memory: 192Mi
            limits:
              memory: 384Mi
          readinessProbe:
            httpGet:
              path: /ready
              port: http
---
apiVersion: v1
kind: Service
metadata:
  name: orders-api
spec:
  selector:
    app: orders-api
  ports:
    - port: 80
      targetPort: http
`,
    },
  },
]
