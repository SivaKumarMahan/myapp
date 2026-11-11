import type { AppProfile, Cluster, ImageFact, NodeRecord, Registry } from './types'

/**
 * The cluster every scenario starts from: a three-node AKS cluster
 * (Kubernetes 1.34) with CoreDNS, metrics-server, an ingress-nginx
 * controller behind a public IP, the AKS storage classes and the public
 * images the Sandbox can use. Scenarios add their own namespace, images and
 * registries on top.
 */

export const LB_IP = '20.73.112.45'
export const CLUSTER_NAME = 'aks-lab'

const day = 24 * 3600
export const CLUSTER_AGE = 41 * day

const zones = ['westeurope-1', 'westeurope-2', 'westeurope-3']

export function defaultNodes(): NodeRecord[] {
  return [0, 1, 2].map((index) => {
    const name = `aks-nodepool1-31718369-vmss00000${index}`
    return {
      name,
      labels: {
        agentpool: 'nodepool1',
        'beta.kubernetes.io/arch': 'amd64',
        'beta.kubernetes.io/os': 'linux',
        'kubernetes.azure.com/agentpool': 'nodepool1',
        'kubernetes.azure.com/mode': 'system',
        'kubernetes.io/arch': 'amd64',
        'kubernetes.io/hostname': name,
        'kubernetes.io/os': 'linux',
        'node.kubernetes.io/instance-type': 'Standard_D2s_v5',
        'topology.kubernetes.io/region': 'westeurope',
        'topology.kubernetes.io/zone': zones[index],
      },
      taints: [],
      cpu: 1900,
      memory: 5900,
      ip: `10.224.0.${4 + index}`,
      createdAt: -CLUSTER_AGE,
    }
  })
}

/** A GPU node pool with the usual taint, for the scheduling scenarios. */
export function gpuNode(): NodeRecord {
  const name = 'aks-gpupool-27384561-vmss000000'
  return {
    name,
    labels: {
      agentpool: 'gpupool',
      'beta.kubernetes.io/arch': 'amd64',
      'beta.kubernetes.io/os': 'linux',
      'kubernetes.azure.com/agentpool': 'gpupool',
      'kubernetes.azure.com/mode': 'user',
      'kubernetes.io/arch': 'amd64',
      'kubernetes.io/hostname': name,
      'kubernetes.io/os': 'linux',
      'node.kubernetes.io/instance-type': 'Standard_NC4as_T4_v3',
      'topology.kubernetes.io/region': 'westeurope',
      'topology.kubernetes.io/zone': 'westeurope-1',
    },
    taints: [{ key: 'sku', value: 'gpu', effect: 'NoSchedule' }],
    cpu: 3860,
    memory: 23000,
    ip: '10.224.1.4',
    createdAt: -12 * day,
  }
}

const NGINX_WELCOME =
  '<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, nginx is successfully installed and working.</p>\n</body>\n</html>'

const nginxApp: AppProfile = {
  command: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
  port: 80,
  memory: 9,
  cpu: 1,
  routes: { '/': NGINX_WELCOME, '/index.html': NGINX_WELCOME },
  notFound:
    '<html>\n<head><title>404 Not Found</title></head>\n<body>\n<center><h1>404 Not Found</h1></center>\n<hr><center>nginx/1.29.3</center>\n</body>\n</html>',
  logs: [
    '/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration',
    '/docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh',
    '/docker-entrypoint.sh: Configuration complete; ready for start up',
    '2026/11/11 09:00:02 [notice] 1#1: nginx/1.29.3',
    '2026/11/11 09:00:02 [notice] 1#1: start worker processes',
  ],
  bins: ['nginx', 'sh', 'bash', 'curl', 'cat', 'env', 'printenv', 'ls', 'sleep', 'echo'],
  runtime: 'nginx',
}

export function defaultImages(): ImageFact[] {
  return [
    {
      repo: 'docker.io/library/nginx',
      tags: ['1.27', '1.28', '1.29', '1.29.3', 'stable', 'alpine', 'latest'],
      app: nginxApp,
    },
    {
      repo: 'docker.io/library/busybox',
      tags: ['1.36', '1.37', 'latest'],
      app: {
        command: ['sh'],
        port: null,
        memory: 1,
        cpu: 0,
        exits: 0,
        logs: [],
        bins: ['sh', 'wget', 'nslookup', 'env', 'printenv', 'cat', 'ls', 'sleep', 'echo'],
        runtime: 'shell',
      },
    },
    {
      repo: 'docker.io/curlimages/curl',
      tags: ['8.17.0', 'latest'],
      app: {
        command: ['curl'],
        port: null,
        memory: 2,
        cpu: 0,
        exits: 2,
        logs: ["curl: try 'curl --help' or 'curl --manual' for more information"],
        bins: ['curl', 'sh', 'nslookup', 'env', 'cat', 'sleep'],
        runtime: 'shell',
      },
    },
    {
      repo: 'docker.io/library/httpd',
      tags: ['2.4', 'latest'],
      app: {
        ...nginxApp,
        command: ['httpd-foreground'],
        routes: { '/': '<html><body><h1>It works!</h1></body></html>' },
        logs: [
          "AH00558: httpd: Could not reliably determine the server's fully qualified domain name",
          '[mpm_event:notice] [pid 1:tid 1] AH00489: Apache/2.4.65 (Unix) configured -- resuming normal operations',
        ],
      },
    },
    {
      repo: 'mcr.microsoft.com/oss/v2/kubernetes/coredns',
      tags: ['v1.12.1-2'],
      app: {
        command: ['/coredns', '-conf', '/etc/coredns/Corefile'],
        port: 8080,
        memory: 24,
        cpu: 3,
        routes: { '/health': 'OK', '/ready': 'OK' },
        logs: ['.:53', 'CoreDNS-1.12.1', 'linux/amd64, go1.24.6'],
        bins: ['coredns'],
        runtime: 'go',
      },
    },
    {
      repo: 'mcr.microsoft.com/oss/v2/kubernetes/metrics-server',
      tags: ['v0.8.0'],
      app: {
        command: ['/metrics-server'],
        port: 4443,
        memory: 31,
        cpu: 4,
        routes: { '/livez': 'ok', '/readyz': 'ok' },
        logs: [
          'I1111 09:00:01.000000 1 serving.go:380] Generated self-signed cert',
          'I1111 09:00:02.000000 1 secure_serving.go:213] Serving securely on [::]:4443',
        ],
        bins: ['metrics-server'],
        runtime: 'go',
      },
    },
    {
      repo: 'registry.k8s.io/ingress-nginx/controller',
      tags: ['v1.14.0'],
      app: {
        command: ['/nginx-ingress-controller', '--ingress-class=nginx'],
        port: 80,
        memory: 96,
        cpu: 5,
        routes: { '/healthz': 'ok' },
        logs: [
          '-------------------------------------------------------------------------------',
          'NGINX Ingress controller',
          '  Release:       v1.14.0',
          '  nginx version: nginx/1.27.1',
          '-------------------------------------------------------------------------------',
          'I1111 09:00:03.000000       7 main.go:205] "Creating API client" host="https://10.0.0.1:443"',
          'I1111 09:00:04.000000       7 controller.go:214] "Configuration changes detected, backend reload required"',
          'I1111 09:00:04.500000       7 controller.go:228] "Backend successfully reloaded"',
        ],
        bins: ['nginx-ingress-controller', 'sh', 'curl', 'cat'],
        runtime: 'go',
      },
    },
  ]
}

export function defaultRegistries(): Registry[] {
  return [
    { host: 'docker.io', anonymous: true, kubeletAccess: true },
    { host: 'registry.k8s.io', anonymous: true, kubeletAccess: true },
    { host: 'mcr.microsoft.com', anonymous: true, kubeletAccess: true },
  ]
}

/** System workloads, applied 41 days ago. */
export const BASE_MANIFESTS = `
apiVersion: v1
kind: Namespace
metadata:
  name: default
---
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
---
apiVersion: v1
kind: Namespace
metadata:
  name: kube-public
---
apiVersion: v1
kind: Namespace
metadata:
  name: kube-node-lease
---
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx
  labels:
    app.kubernetes.io/name: ingress-nginx
---
apiVersion: v1
kind: Service
metadata:
  name: kubernetes
  namespace: default
  labels:
    component: apiserver
    provider: kubernetes
spec:
  clusterIP: 10.0.0.1
  ports:
    - name: https
      port: 443
      targetPort: 443
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
  labels:
    k8s-app: kube-dns
    kubernetes.azure.com/managedby: aks
spec:
  replicas: 2
  selector:
    matchLabels:
      k8s-app: kube-dns
  template:
    metadata:
      labels:
        k8s-app: kube-dns
    spec:
      containers:
        - name: coredns
          image: mcr.microsoft.com/oss/v2/kubernetes/coredns:v1.12.1-2
          args: ["-conf", "/etc/coredns/Corefile"]
          ports:
            - name: dns
              containerPort: 53
              protocol: UDP
            - name: metrics
              containerPort: 9153
          resources:
            requests:
              cpu: 100m
              memory: 70Mi
            limits:
              memory: 500Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: kube-dns
  namespace: kube-system
  labels:
    k8s-app: kube-dns
spec:
  clusterIP: 10.0.0.10
  selector:
    k8s-app: kube-dns
  ports:
    - name: dns
      port: 53
      protocol: UDP
      targetPort: 53
    - name: dns-tcp
      port: 53
      protocol: TCP
      targetPort: 53
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
  labels:
    k8s-app: metrics-server
spec:
  replicas: 1
  selector:
    matchLabels:
      k8s-app: metrics-server
  template:
    metadata:
      labels:
        k8s-app: metrics-server
    spec:
      containers:
        - name: metrics-server
          image: mcr.microsoft.com/oss/v2/kubernetes/metrics-server:v0.8.0
          ports:
            - name: https
              containerPort: 4443
          resources:
            requests:
              cpu: 50m
              memory: 85Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
  labels:
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/component: controller
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: ingress-nginx
      app.kubernetes.io/component: controller
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ingress-nginx
        app.kubernetes.io/component: controller
    spec:
      containers:
        - name: controller
          image: registry.k8s.io/ingress-nginx/controller:v1.14.0
          args: ["--ingress-class=nginx"]
          ports:
            - name: http
              containerPort: 80
            - name: https
              containerPort: 443
          resources:
            requests:
              cpu: 100m
              memory: 90Mi
          readinessProbe:
            httpGet:
              path: /healthz
              port: 80
---
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
  labels:
    app.kubernetes.io/name: ingress-nginx
spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/component: controller
  ports:
    - name: http
      port: 80
      targetPort: http
    - name: https
      port: 443
      targetPort: https
---
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: nginx
  labels:
    app.kubernetes.io/name: ingress-nginx
spec:
  controller: k8s.io/ingress-nginx
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: default
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: disk.csi.azure.com
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  skuName: StandardSSD_LRS
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-csi
provisioner: disk.csi.azure.com
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  skuName: StandardSSD_LRS
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: managed-csi-premium
provisioner: disk.csi.azure.com
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
parameters:
  skuName: Premium_LRS
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azurefile-csi
provisioner: file.csi.azure.com
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
parameters:
  skuName: Standard_LRS
`

/** An empty cluster (no objects yet) with the base nodes, images and registries. */
export function emptyCluster(): Cluster {
  return {
    now: -CLUSTER_AGE,
    namespace: 'default',
    nodes: defaultNodes(),
    objects: [],
    replicaSets: [],
    pods: [],
    events: [],
    images: defaultImages(),
    registries: defaultRegistries(),
    seq: 0,
    lbIp: LB_IP,
    deleted: [],
  }
}
