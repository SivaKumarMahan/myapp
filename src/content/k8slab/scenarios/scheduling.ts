import { gpuNode } from '../../../lib/k8slab/world'
import type { K8sScenario } from '../types'
import { SHOP_ACR, image, nodeService, pythonService } from './apps'

export const schedulingScenarios: K8sScenario[] = [
  {
    id: 'requests-too-big',
    title: 'Pending: Insufficient cpu',
    category: 'Scheduling',
    level: 'simple',
    story:
      'The data team moved `ml-scorer` from a 4-vCPU VM to AKS and copied the VM size into the manifest. In staging it peaked at about **300m CPU and 900Mi memory**. In this cluster (Standard_D2s_v5 nodes) its Pods never start.',
    task: 'Get Deployment `ml-scorer` (namespace `ml`) running with **2 replicas** by sizing its requests and limits to what it really uses. Keep CPU and memory requests (no BestEffort Pods).',
    symptom: 'Both Pods are `Pending` and have no node; nothing in the logs.',
    hints: [
      'A Pending Pod has not been placed on a node yet - the **scheduler** explains why in `kubectl describe pod` (event `FailedScheduling`).',
      "Compare the Pod's requests (`kubectl get deploy ml-scorer -o yaml`) with what a node can offer (`kubectl describe node` → Allocatable). A request bigger than any node can never fit.",
      '`kubectl set resources deployment/ml-scorer -c scorer --requests=cpu=500m,memory=1Gi --limits=cpu=1,memory=1536Mi`',
    ],
    solution: {
      commands: [
        'kubectl set resources deployment/ml-scorer -c scorer --requests=cpu=500m,memory=1Gi --limits=cpu=1,memory=1536Mi',
      ],
    },
    explanation: [
      {
        code: 'kubectl describe pod <pod>',
        note: '`0/3 nodes are available: 3 Insufficient cpu.` - every node was considered and none has 4 free CPUs.',
      },
      {
        code: 'kubectl describe node <node>',
        note: 'Allocatable CPU is 1900m on a 2-vCPU node (AKS reserves some for the kubelet and OS). A 4-CPU request can never fit, and the cluster autoscaler would only add more 2-vCPU nodes.',
      },
      {
        code: 'kubectl set resources ... --requests=cpu=500m,memory=1Gi',
        note: 'Requests are what the scheduler reserves: size them to real use plus a margin.',
      },
      {
        code: '--limits=cpu=1,memory=1536Mi',
        note: 'Limits cap bursts; memory limit stays well above the 900Mi peak so it is not OOMKilled.',
      },
    ],
    wrongFix: {
      commands: ['kubectl scale deployment ml-scorer --replicas=1'],
      why: 'One Pod that asks for 4 CPUs still fits nowhere.',
    },
    checks: [
      { kind: 'rollout', deployment: 'ml-scorer' },
      { kind: 'replicas', deployment: 'ml-scorer', count: 2 },
      {
        kind: 'cpu-request',
        deployment: 'ml-scorer',
        container: 'scorer',
        min: '250m',
        max: '1500m',
      },
      {
        kind: 'memory-limit',
        deployment: 'ml-scorer',
        container: 'scorer',
        min: '1Gi',
        max: '3Gi',
      },
    ],
    rootCause: {
      question: 'Why could the Pods not be scheduled?',
      options: [
        {
          text: 'Each Pod requests 4 CPUs, more than any node can allocate (1.9 CPUs), so the scheduler has nowhere to put it.',
          correct: true,
          why: "`Insufficient cpu` on all 3 nodes, and the request exceeds even an empty node's allocatable CPU.",
        },
        {
          text: 'The cluster autoscaler is broken.',
          why: 'It would add another Standard_D2s_v5 node - which still cannot fit a 4-CPU request.',
        },
        {
          text: 'A ResourceQuota in the namespace blocks the Pods.',
          why: 'A quota rejects Pod creation (`exceeded quota`) - the Pods would not exist. These exist and are Pending.',
        },
        {
          text: 'The nodes are tainted.',
          why: 'The scheduler would say `untolerated taint`, not `Insufficient cpu`.',
        },
      ],
    },
    lesson:
      'Requests drive scheduling, limits drive throttling and OOM kills. A request larger than any node\'s allocatable means "Pending forever". Size from measurements, and remember allocatable is less than the VM size.',
    followUp:
      'When would you set a CPU limit at all - and when does a CPU limit hurt latency even though the node has idle CPU?',
    tags: ['pending', 'scheduling', 'requests', 'limits', 'insufficient cpu'],
    related: ['itv-myk8s-66', 'itv-k8s-7', 'itv-k8s-21', 'itv-k8s-20'],
    setup: {
      namespace: 'ml',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/ml/scorer',
          ['0.9.3'],
          pythonService('ml-scorer', 'scorer.api', {
            port: 8000,
            version: '0.9.3',
            memory: 900,
            cpu: 290,
            logs: ['INFO:scorer.api:Model loaded (412 MiB)'],
          }),
        ),
      ],
      manifests: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-scorer
  labels:
    app: ml-scorer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ml-scorer
  template:
    metadata:
      labels:
        app: ml-scorer
    spec:
      containers:
        - name: scorer
          image: acrshoplab.azurecr.io/ml/scorer:0.9.3
          ports:
            - name: http
              containerPort: 8000
          resources:
            requests:
              cpu: "4"
              memory: 2Gi
            limits:
              cpu: "4"
              memory: 3Gi
`,
    },
  },
  {
    id: 'taint-toleration',
    title: 'Pending: untolerated taint on the GPU pool',
    category: 'Scheduling',
    level: 'medium',
    story:
      'The platform team added a GPU node pool and tainted it `sku=gpu:NoSchedule` so ordinary workloads stay off the expensive nodes. The vision team pinned their `image-tagger` to that pool with a nodeSelector - and it has been Pending ever since.',
    task: "Get Deployment `image-tagger` (namespace `vision`) running **on the GPU pool**. Don't change the node or its taint.",
    symptom: 'Pods `Pending`; the GPU node is idle.',
    hints: [
      '`kubectl describe pod` - read the whole FailedScheduling message: each node is ruled out for a reason.',
      'Three nodes do not match the nodeSelector; the GPU node matches but has a taint the Pod does not tolerate. See `kubectl describe node aks-gpupool-27384561-vmss000000 | grep Taints`.',
      '`kubectl patch deployment image-tagger -p \'{"spec":{"template":{"spec":{"tolerations":[{"key":"sku","operator":"Equal","value":"gpu","effect":"NoSchedule"}]}}}}\'`',
    ],
    solution: {
      commands: [
        'kubectl patch deployment image-tagger -p \'{"spec":{"template":{"spec":{"tolerations":[{"key":"sku","operator":"Equal","value":"gpu","effect":"NoSchedule"}]}}}}\'',
      ],
    },
    explanation: [
      {
        code: 'kubectl describe pod <pod>',
        note: "`0/4 nodes are available: 1 node(s) had untolerated taint {sku: gpu}, 3 node(s) didn't match Pod's node affinity/selector.`",
      },
      {
        code: 'nodeSelector: agentpool: gpupool',
        note: 'Attracts the Pod to the GPU pool - but a selector never overrides a taint.',
      },
      {
        code: 'tolerations: [{key: sku, value: gpu, effect: NoSchedule}]',
        note: 'A toleration lets the Pod onto a tainted node. You need both: the taint keeps others off, the selector keeps you on.',
      },
      { code: 'kubectl get pods -o wide', note: 'The Pod lands on aks-gpupool-...' },
    ],
    wrongFix: {
      commands: [
        'kubectl patch deployment image-tagger --type json -p \'[{"op":"remove","path":"/spec/template/spec/nodeSelector"}]\'',
      ],
      why: 'The Pods start - on the CPU nodes, without a GPU. The workload must run on the GPU pool.',
    },
    checks: [
      { kind: 'rollout', deployment: 'image-tagger' },
      { kind: 'node-selector', deployment: 'image-tagger', labels: { agentpool: 'gpupool' } },
      { kind: 'taint', node: 'aks-gpupool-27384561-vmss000000', key: 'sku' },
    ],
    rootCause: {
      question: 'Why were the Pods Pending?',
      options: [
        {
          text: "The nodeSelector only allows the GPU node, and that node's `sku=gpu:NoSchedule` taint is not tolerated by the Pods.",
          correct: true,
          why: 'Every node is excluded: three by the selector, the GPU node by the taint.',
        },
        {
          text: 'The GPU node is full.',
          why: 'That would be `Insufficient cpu/memory`. The node is empty.',
        },
        {
          text: 'The nodeSelector label is misspelled.',
          why: 'The GPU node does carry `agentpool=gpupool`; the scheduler blames the taint for it.',
        },
        {
          text: 'The GPU driver is not installed.',
          why: 'Drivers matter after scheduling; these Pods were never placed on a node.',
        },
      ],
    },
    lesson:
      'Taints repel, tolerations permit, selectors/affinity attract. Dedicated pools need both a taint (keep others off) and a selector or affinity plus toleration on the workloads that belong there.',
    followUp: 'How would you make sure only the vision team can tolerate the GPU taint?',
    tags: ['taints', 'tolerations', 'nodeselector', 'pending', 'scheduling'],
    related: ['itv-myk8s-67', 'itv-k8s-24', 'itv-myk8s-36'],
    setup: {
      namespace: 'vision',
      registries: [SHOP_ACR],
      extraNodes: [gpuNode()],
      images: [
        image(
          'acrshoplab.azurecr.io/vision/image-tagger',
          ['2.2.0'],
          pythonService('image-tagger', 'tagger.worker', {
            port: null,
            version: '2.2.0',
            memory: 1400,
            cpu: 600,
          }),
        ),
      ],
      manifests: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: image-tagger
  labels:
    app: image-tagger
spec:
  replicas: 1
  selector:
    matchLabels:
      app: image-tagger
  template:
    metadata:
      labels:
        app: image-tagger
    spec:
      nodeSelector:
        agentpool: gpupool
      containers:
        - name: tagger
          image: acrshoplab.azurecr.io/vision/image-tagger:2.2.0
          resources:
            requests:
              cpu: "1"
              memory: 2Gi
            limits:
              memory: 4Gi
`,
    },
  },
  {
    id: 'pvc-storageclass',
    title: 'Pending: PVC with a storage class that does not exist',
    category: 'Scheduling',
    level: 'medium',
    story:
      'The docs team deployed an internal `wiki` with a persistent volume. They copied the storage class name from an old blog post. The Pod has been Pending for 15 minutes and the volume claim never binds.',
    task: 'Get Deployment `wiki` (namespace `docs`) running with its data on a **Premium SSD** volume. The claim must stay a PersistentVolumeClaim (no emptyDir).',
    symptom: 'Pod `Pending`; PVC `wiki-data` `Pending`.',
    hints: [
      'Start from the Pod (`describe pod`), then follow the trail to the claim: `kubectl describe pvc wiki-data`.',
      "Which storage classes exist? `kubectl get storageclass`. Note that a PVC's `storageClassName` cannot be changed after creation - try a patch and see.",
      'Save the claim (`kubectl get pvc wiki-data -o yaml > wiki-data.yaml`), set `storageClassName: managed-csi-premium` in the Files tab, then `kubectl delete pvc wiki-data` and `kubectl apply -f wiki-data.yaml`.',
    ],
    solution: {
      files: [
        {
          name: 'wiki-data.yaml',
          content: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wiki-data
  namespace: docs
  labels:
    app: wiki
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: managed-csi-premium
  resources:
    requests:
      storage: 32Gi
`,
        },
      ],
      commands: ['kubectl delete pvc wiki-data', 'kubectl apply -f wiki-data.yaml'],
    },
    explanation: [
      {
        code: 'kubectl describe pod <pod>',
        note: '`pod has unbound immediate PersistentVolumeClaims` - the scheduler waits for the claim.',
      },
      {
        code: 'kubectl describe pvc wiki-data',
        note: '`ProvisioningFailed: storageclass.storage.k8s.io "managed-premium-ssd" not found`.',
      },
      {
        code: 'kubectl get storageclass',
        note: 'AKS ships `managed-csi-premium` (Premium SSD, CSI driver). The old in-tree names are gone.',
      },
      {
        code: 'kubectl delete pvc wiki-data && kubectl apply -f wiki-data.yaml',
        note: "A claim's spec is immutable, so it is recreated. Safe here because it never bound - there is no data yet.",
      },
      {
        code: 'kubectl get pvc',
        note: 'With `WaitForFirstConsumer`, the claim binds once the Pod is scheduled.',
      },
    ],
    wrongFix: {
      commands: [
        'kubectl patch pvc wiki-data -p \'{"spec":{"storageClassName":"managed-csi-premium"}}\'',
      ],
      why: 'The API server rejects it: a PVC spec is immutable after creation except the storage request.',
    },
    checks: [
      { kind: 'rollout', deployment: 'wiki' },
      { kind: 'volume', deployment: 'wiki' },
      { kind: 'pvc', deployment: 'wiki' },
    ],
    rootCause: {
      question: 'What kept the Pod Pending?',
      options: [
        {
          text: 'The claim names a storage class that does not exist, so no volume is provisioned and the Pod cannot be scheduled.',
          correct: true,
          why: '`ProvisioningFailed ... not found` on the PVC and `unbound immediate PersistentVolumeClaims` on the Pod.',
        },
        {
          text: 'The subscription ran out of disk quota.',
          why: 'Azure would reject the disk with its own error from the CSI driver; here the class name is not even found.',
        },
        {
          text: 'ReadWriteOnce cannot be used by a Deployment.',
          why: 'RWO works with one replica (or several on one node). It is about attach, not about the object kind.',
        },
        {
          text: 'The nodes have no free CPU.',
          why: 'Then the scheduler would say `Insufficient cpu`.',
        },
      ],
    },
    lesson:
      'For Pending Pods with volumes, follow Pod → PVC → StorageClass → provisioner events. Claims are immutable, so fixing a wrong class means recreating the claim - fine before it binds, a migration after.',
    followUp:
      'The claim was bound and holds data, and you need to move it to a faster class. How do you do it without losing data?',
    tags: ['pvc', 'storageclass', 'pending', 'storage', 'csi'],
    related: ['itv-k8s-40', 'itv-myk8s-85', 'itv-myk8s-66'],
    setup: {
      namespace: 'docs',
      registries: [SHOP_ACR],
      images: [
        image(
          'acrshoplab.azurecr.io/docs/wiki',
          ['1.12.0'],
          nodeService('wiki', { port: 3000, version: '1.12.0', memory: 180 }),
        ),
      ],
      manifests: `
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wiki-data
  labels:
    app: wiki
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: managed-premium-ssd
  resources:
    requests:
      storage: 32Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wiki
  labels:
    app: wiki
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: wiki
  template:
    metadata:
      labels:
        app: wiki
    spec:
      containers:
        - name: wiki
          image: acrshoplab.azurecr.io/docs/wiki:1.12.0
          ports:
            - name: http
              containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              memory: 512Mi
          volumeMounts:
            - name: data
              mountPath: /var/lib/wiki
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: wiki-data
`,
    },
  },
]
