import type { K8sScenario } from '../types'
import { SHOP_ACR, image, nodeService } from './apps'

const deployment = (name: string, repo: string, port: number, labels: Record<string, string>) => `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  labels:
    app: ${name}
spec:
  replicas: 2
  selector:
    matchLabels:
${Object.entries(labels)
  .map(([key, value]) => `      ${key}: ${value}`)
  .join('\n')}
  template:
    metadata:
      labels:
${Object.entries(labels)
  .map(([key, value]) => `        ${key}: ${value}`)
  .join('\n')}
    spec:
      containers:
        - name: ${name}
          image: ${repo}
          ports:
            - name: http
              containerPort: ${port}
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
`

const ingress = (
  name: string,
  host: string,
  paths: { path: string; service: string }[],
  className = 'nginx',
) => `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${name}
spec:
${className ? `  ingressClassName: ${className}\n` : ''}  rules:
    - host: ${host}
      http:
        paths:
${paths
  .map(
    (entry) => `          - path: ${entry.path}
            pathType: Prefix
            backend:
              service:
                name: ${entry.service}
                port:
                  number: 80`,
  )
  .join('\n')}
`

export const networkingScenarios: K8sScenario[] = [
  {
    id: 'service-selector',
    title: 'Service with no endpoints',
    category: 'Networking & Ingress',
    level: 'simple',
    story:
      'During a naming clean-up the `checkout` Pods were relabelled from `app: checkout-api` to `app: checkout`. The Deployment rolled out fine and every Pod is Ready, but `http://pay.example.com/` returns **503**.',
    task: 'Make `http://pay.example.com/` reach the `checkout` Pods (namespace `checkout`). Traffic must go to the Pods the Deployment manages.',
    symptom:
      'All Pods `1/1 Running`; the ingress answers 503; `kubectl get endpoints checkout` shows `<none>`.',
    hints: [
      'Walk the chain: Ingress → Service → endpoints. `kubectl describe svc checkout` shows the selector and the (empty) endpoints.',
      'Compare the Service selector with the Pod labels: `kubectl get pods --show-labels`.',
      '`kubectl patch service checkout -p \'{"spec":{"selector":{"app":"checkout"}}}\'`',
    ],
    solution: {
      commands: ['kubectl patch service checkout -p \'{"spec":{"selector":{"app":"checkout"}}}\''],
    },
    explanation: [
      {
        code: 'kubectl get endpointslices -l kubernetes.io/service-name=checkout',
        note: 'No endpoints: the Service selects nothing.',
      },
      {
        code: 'kubectl get pods --show-labels',
        note: 'Pods carry `app=checkout`; the Service still selects `app=checkout-api`.',
      },
      {
        code: 'kubectl patch service checkout -p ...',
        note: 'Fix the Service, not the Pods: Service selectors are cheap to change, and the Deployment owns the Pod labels.',
      },
      { code: 'curl http://pay.example.com/', note: '200 - endpoints appear within seconds.' },
    ],
    wrongFix: {
      commands: ['kubectl label pods -l app=checkout app=checkout-api --overwrite'],
      why: "Relabelled Pods stop matching their ReplicaSet's selector: they are orphaned, the ReplicaSet creates replacements, and the Service now points at unmanaged Pods that no rollout will ever update.",
    },
    checks: [
      { kind: 'rollout', deployment: 'checkout' },
      { kind: 'endpoints', service: 'checkout', deployment: 'checkout' },
      { kind: 'http', url: 'http://pay.example.com/', status: 200 },
    ],
    rootCause: {
      question: 'Why did the ingress return 503?',
      options: [
        {
          text: 'The Service selector (`app: checkout-api`) no longer matches the Pod labels, so it has no endpoints.',
          correct: true,
          why: 'Endpoints are empty while the Pods are Ready; the labels differ.',
        },
        {
          text: 'The Pods are not Ready.',
          why: 'They are 1/1 Ready. Not-ready Pods would show up as not-ready addresses.',
        },
        {
          text: 'The Service targetPort is wrong.',
          why: 'A wrong targetPort still produces endpoints (and a 502, not a 503).',
        },
        {
          text: 'A NetworkPolicy blocks the ingress controller.',
          why: 'That would time out or 504 with endpoints present; here there are none.',
        },
      ],
    },
    lesson:
      "A Service is a label query. If endpoints are empty, compare its selector with `--show-labels` on the Pods. Change selectors on the Service side; relabelling Pods behind a controller's back orphans them.",
    followUp:
      "Why is a Deployment's `spec.selector` immutable, and how would you rename labels on a live Deployment without downtime?",
    tags: ['service', 'selector', 'labels', 'endpoints', '503'],
    related: ['itv-k8s-3', 'itv-k8s-32', 'itv-k8s-27'],
    setup: {
      namespace: 'checkout',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/checkout/checkout',
          ['6.4.1'],
          nodeService('checkout', { port: 8080, version: '6.4.1' }),
        ),
      ],
      manifests: `${deployment('checkout', 'acrshoplab.azurecr.io/checkout/checkout:6.4.1', 8080, { app: 'checkout', tier: 'backend' })}---
apiVersion: v1
kind: Service
metadata:
  name: checkout
spec:
  selector:
    app: checkout-api
  ports:
    - port: 80
      targetPort: http
---${ingress('pay', 'pay.example.com', [{ path: '/', service: 'checkout' }])}`,
    },
  },
  {
    id: 'service-targetport',
    title: '502 Bad Gateway: wrong targetPort',
    category: 'Networking & Ingress',
    level: 'simple',
    story:
      'The `inventory` service was rewritten from Java to Node.js. The new app listens on **3000**; the Service was copied from the old one. Pods are Ready, the Service has endpoints, and yet `http://stock.example.com/` returns **502 Bad Gateway**.',
    task: 'Make `http://stock.example.com/` work (namespace `inventory`) without changing the app.',
    symptom:
      'Endpoints exist, Pods are Ready, the ingress answers 502; from inside the cluster `curl inventory` says connection refused.',
    hints: [
      'Test each hop. From inside: `kubectl exec deploy/inventory -- curl -s localhost:3000/healthz` vs `curl -s inventory/healthz`.',
      'The Service forwards to `targetPort`. Which port does the app listen on (`kubectl logs`), and which port do the endpoints use (`kubectl get endpointslices`)?',
      '`kubectl patch service inventory --type json -p \'[{"op":"replace","path":"/spec/ports/0/targetPort","value":3000}]\'`',
    ],
    solution: {
      commands: [
        'kubectl patch service inventory --type json -p \'[{"op":"replace","path":"/spec/ports/0/targetPort","value":3000}]\'',
      ],
    },
    explanation: [
      {
        code: 'curl -i http://stock.example.com/',
        note: '502 from nginx: it reached an endpoint, but the connection was refused.',
      },
      {
        code: 'kubectl get endpointslices',
        note: "Endpoints are `10.244.x.y:8080` - the Service's targetPort, not the app's port.",
      },
      {
        code: 'kubectl exec deploy/inventory -- curl -s localhost:3000/healthz',
        note: 'The app answers on 3000. Nothing listens on 8080.',
      },
      {
        code: 'kubectl patch service inventory ... targetPort 3000',
        note: 'Better still, use the named port: `targetPort: http`, so the Service follows the container port.',
      },
    ],
    wrongFix: {
      commands: [
        'kubectl patch deployment inventory --type json -p \'[{"op":"replace","path":"/spec/template/spec/containers/0/ports/0/containerPort","value":8080}]\'',
      ],
      why: '`containerPort` is documentation for humans and tools - it does not make the app listen anywhere. The app still binds 3000.',
    },
    checks: [
      { kind: 'rollout', deployment: 'inventory' },
      { kind: 'endpoints', service: 'inventory', deployment: 'inventory' },
      { kind: 'http', url: 'http://stock.example.com/', status: 200 },
      { kind: 'http', url: 'http://inventory.inventory/healthz', status: 200, from: 'cluster' },
    ],
    rootCause: {
      question: 'Why 502?',
      options: [
        {
          text: 'The Service sends traffic to port 8080, but the app listens on 3000, so every connection is refused.',
          correct: true,
          why: 'Endpoints use :8080; the app answers on localhost:3000.',
        },
        {
          text: 'The Service selector matches no Pods.',
          why: 'There are endpoints - that would be a 503.',
        },
        {
          text: 'The readiness probe fails.',
          why: 'Pods are Ready and listed as ready endpoints.',
        },
        {
          text: '`containerPort` is wrong in the Deployment.',
          why: "containerPort is informational; the Service's targetPort decides where traffic goes.",
        },
      ],
    },
    lesson:
      '503 = no ready endpoints; 502 = an endpoint exists but refused or broke the connection. Prefer named target ports so Services follow the container definition.',
    followUp:
      'A Service has `port: 80, targetPort: 8080` and the container listens on 3000. Walk through exactly what kube-proxy does with a packet.',
    tags: ['service', 'targetport', '502', 'endpoints', 'ingress'],
    related: ['itv-k8s-33', 'itv-k8s-11', 'itv-k8s-32'],
    setup: {
      namespace: 'inventory',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/inventory/inventory',
          ['2.0.0'],
          nodeService('inventory', { port: 3000, version: '2.0.0' }),
        ),
      ],
      manifests: `${deployment('inventory', 'acrshoplab.azurecr.io/inventory/inventory:2.0.0', 3000, { app: 'inventory' })}---
apiVersion: v1
kind: Service
metadata:
  name: inventory
spec:
  selector:
    app: inventory
  ports:
    - port: 80
      targetPort: 8080
---${ingress('stock', 'stock.example.com', [{ path: '/', service: 'inventory' }])}`,
    },
  },
  {
    id: 'ingress-no-class',
    title: 'Ingress 404 from the default backend',
    category: 'Networking & Ingress',
    level: 'medium',
    story:
      "The team behind the company `blog` wrote their first Ingress by hand. DNS for `blog.example.com` points at the ingress controller, the Pods and Service are healthy, yet every request gets nginx's plain **404 Not Found**.",
    task: 'Make `http://blog.example.com/` serve the blog (namespace `blog`) through the existing ingress-nginx controller.',
    symptom:
      '`curl http://blog.example.com/` → 404 from nginx; `kubectl get ingress` shows no ADDRESS.',
    hints: [
      'Is the Ingress served at all? `kubectl get ingress` - look at the CLASS and ADDRESS columns.',
      'Which IngressClasses exist (`kubectl get ingressclass`) and does the Ingress name one? Is any class the cluster default?',
      '`kubectl patch ingress blog --type merge -p \'{"spec":{"ingressClassName":"nginx"}}\'`',
    ],
    solution: {
      commands: [
        'kubectl patch ingress blog --type merge -p \'{"spec":{"ingressClassName":"nginx"}}\'',
      ],
    },
    explanation: [
      {
        code: 'kubectl get ingress blog',
        note: 'CLASS `<none>`, ADDRESS empty: no controller has picked it up.',
      },
      {
        code: 'kubectl get ingressclass',
        note: 'Only `nginx`, and it is not marked as default - so a classless Ingress belongs to nobody.',
      },
      {
        code: 'curl -i http://blog.example.com/',
        note: 'The 404 page is the controller\'s default backend: "no rule matched this host".',
      },
      {
        code: 'kubectl patch ingress blog --type merge -p ...',
        note: 'With `ingressClassName: nginx` the controller loads the rule; ADDRESS appears and the blog answers 200.',
      },
    ],
    wrongFix: {
      commands: ['kubectl annotate ingress blog nginx.ingress.kubernetes.io/rewrite-target=/'],
      why: 'Annotations configure a rule the controller already serves. This Ingress is not served at all.',
    },
    checks: [
      { kind: 'exists', resource: 'Ingress', name: 'blog' },
      { kind: 'endpoints', service: 'blog', deployment: 'blog' },
      { kind: 'http', url: 'http://blog.example.com/', status: 200, contains: 'blog' },
    ],
    rootCause: {
      question: 'Why did nginx answer 404?',
      options: [
        {
          text: 'The Ingress has no ingressClassName and there is no default class, so no controller serves it and requests fall through to the default backend.',
          correct: true,
          why: 'CLASS `<none>`, no ADDRESS, and the generic nginx 404 page.',
        },
        {
          text: 'DNS points to the wrong IP.',
          why: 'The request reached nginx and got its 404 page - DNS works.',
        },
        {
          text: 'The blog Service has no endpoints.',
          why: 'A served rule with no endpoints gives 503, not 404.',
        },
        {
          text: 'The path should be `/blog`.',
          why: 'The rule is `/` Prefix, which matches everything - once the Ingress is served.',
        },
      ],
    },
    lesson:
      "Ingress objects do nothing on their own - a controller must claim them via `ingressClassName`. A default IngressClass is applied only to Ingresses created after it is set. (ingress-nginx was retired by the Kubernetes project in 2026; the same class concept carries over to Gateway API's GatewayClass.)",
    followUp:
      'How would you route this blog with Gateway API instead of Ingress, and why are many teams migrating?',
    tags: ['ingress', 'ingressclass', '404', 'nginx'],
    related: ['itv-k8s-30', 'itv-k8s-14', 'itv-k8s-35', 'itv-myk8s-176'],
    setup: {
      namespace: 'blog',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/blog/blog',
          ['1.4.0'],
          nodeService('blog', {
            port: 8080,
            version: '1.4.0',
            routes: { '/': '<html><body><h1>Engineering blog</h1></body></html>' },
          }),
        ),
      ],
      manifests: `${deployment('blog', 'acrshoplab.azurecr.io/blog/blog:1.4.0', 8080, { app: 'blog' })}---
apiVersion: v1
kind: Service
metadata:
  name: blog
spec:
  selector:
    app: blog
  ports:
    - port: 80
      targetPort: http
---${ingress('blog', 'blog.example.com', [{ path: '/', service: 'blog' }], '')}`,
    },
  },
  {
    id: 'ingress-backend-503',
    title: 'Ingress 503 on one path only',
    category: 'Networking & Ingress',
    level: 'medium',
    story:
      'The public API at `api.example.com` routes `/orders` and `/users` to two services. After someone "standardised" the Ingress, `/orders` still works but `/users` returns **503 Service Temporarily Unavailable**. The users Pods look perfectly healthy.',
    task: 'Make `http://api.example.com/users` work again (namespace `api`) without breaking `/orders`.',
    symptom: '`/orders` → 200, `/users` → 503; all Pods Ready.',
    hints: [
      '`kubectl describe ingress gateway` lists each backend with its endpoints - or an error.',
      'Compare the backend service names in the Ingress with `kubectl get svc`.',
      '`kubectl patch ingress gateway --type json -p \'[{"op":"replace","path":"/spec/rules/0/http/paths/1/backend/service/name","value":"users"}]\'`',
    ],
    solution: {
      commands: [
        'kubectl patch ingress gateway --type json -p \'[{"op":"replace","path":"/spec/rules/0/http/paths/1/backend/service/name","value":"users"}]\'',
      ],
    },
    explanation: [
      {
        code: 'curl -i http://api.example.com/users',
        note: '503 from nginx: the rule matched, but there is no backend to send it to.',
      },
      {
        code: 'kubectl describe ingress gateway',
        note: '`/users  user-svc:80 (<error: services "user-svc" not found>)`.',
      },
      { code: 'kubectl get svc', note: 'The Service is called `users`.' },
      {
        code: 'kubectl patch ingress gateway --type json ...',
        note: "A JSON patch changes only the second path's backend name; `/orders` is untouched.",
      },
    ],
    wrongFix: {
      commands: ['kubectl rollout restart deployment/users'],
      why: 'The users Pods were never the problem - the Ingress points at a Service that does not exist.',
    },
    checks: [
      { kind: 'exists', resource: 'Service', name: 'users' },
      { kind: 'endpoints', service: 'users', deployment: 'users' },
      { kind: 'http', url: 'http://api.example.com/users', status: 200 },
      { kind: 'http', url: 'http://api.example.com/orders', status: 200 },
    ],
    rootCause: {
      question: 'Why did `/users` return 503?',
      options: [
        {
          text: 'The Ingress backend names a Service (`user-svc`) that does not exist in the namespace.',
          correct: true,
          why: '`describe ingress` reports `services "user-svc" not found` for that path.',
        },
        {
          text: 'The users Pods are crashing.',
          why: 'They are Ready with 0 restarts, and the `users` Service has endpoints.',
        },
        {
          text: 'The `/users` path needs `pathType: Exact`.',
          why: 'The rule matched (otherwise you would get 404) - the backend is the problem.',
        },
        {
          text: 'TLS is not configured for the host.',
          why: 'This is plain HTTP; TLS problems are certificate errors, not 503.',
        },
      ],
    },
    lesson:
      "With ingress-nginx, 404 = no rule matched, 503 = rule matched but no usable backend (missing Service, wrong port, no ready endpoints), 502 = backend refused or broke the connection. `kubectl describe ingress` shows each backend's endpoints.",
    followUp:
      'A load balancer in front of the cluster returns 503 for one app. Walk through how you would find which layer is responsible.',
    tags: ['ingress', '503', 'backend', 'service'],
    related: ['itv-myk8s-90', 'itv-k8s-30', 'itv-k8s-14'],
    setup: {
      namespace: 'api',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/api/orders',
          ['3.3.0'],
          nodeService('orders', {
            port: 8080,
            version: '3.3.0',
            routes: { '/orders': '{"orders":[]}' },
          }),
        ),
        image(
          'acrshoplab.azurecr.io/api/users',
          ['2.8.0'],
          nodeService('users', {
            port: 8080,
            version: '2.8.0',
            routes: { '/users': '{"users":[{"id":1,"name":"demo"}]}' },
          }),
        ),
      ],
      manifests: `${deployment('orders', 'acrshoplab.azurecr.io/api/orders:3.3.0', 8080, { app: 'orders' })}---${deployment('users', 'acrshoplab.azurecr.io/api/users:2.8.0', 8080, { app: 'users' })}---
apiVersion: v1
kind: Service
metadata:
  name: orders
spec:
  selector:
    app: orders
  ports:
    - port: 80
      targetPort: http
---
apiVersion: v1
kind: Service
metadata:
  name: users
spec:
  selector:
    app: users
  ports:
    - port: 80
      targetPort: http
---${ingress('gateway', 'api.example.com', [
        { path: '/orders', service: 'orders' },
        { path: '/users', service: 'user-svc' },
      ])}`,
    },
  },
]
