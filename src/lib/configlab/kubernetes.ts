import type { Document } from 'yaml'
import type { Analysis, Finding } from './types'
import { isMapping, lineAt, parseYaml, type Path } from './yaml'

/**
 * A Kubernetes manifest checker: the production-readiness and security
 * checks a reviewer (or a policy engine such as Azure Policy for AKS,
 * Kyverno or kube-score) would make, on every workload in the file.
 */

export interface K8sFacts {
  resources: {
    kind: string
    name: string
    containers: { name: string; image: string }[]
    replicas: number | null
  }[]
}

/** Where each workload kind keeps its pod template. */
const POD_SPEC: Record<string, Path> = {
  Pod: ['spec'],
  Deployment: ['spec', 'template', 'spec'],
  StatefulSet: ['spec', 'template', 'spec'],
  DaemonSet: ['spec', 'template', 'spec'],
  ReplicaSet: ['spec', 'template', 'spec'],
  Job: ['spec', 'template', 'spec'],
  CronJob: ['spec', 'jobTemplate', 'spec', 'template', 'spec'],
}

/** apiVersions that current clusters no longer serve, and what replaced them. */
const REMOVED_APIS: Record<string, string> = {
  'extensions/v1beta1': 'apps/v1 (Deployments, DaemonSets) or networking.k8s.io/v1 (Ingress)',
  'apps/v1beta1': 'apps/v1',
  'apps/v1beta2': 'apps/v1',
  'batch/v1beta1': 'batch/v1',
  'networking.k8s.io/v1beta1': 'networking.k8s.io/v1',
  'policy/v1beta1': 'policy/v1',
  'autoscaling/v2beta2': 'autoscaling/v2',
}

const get = (value: unknown, path: Path): unknown =>
  path.reduce<unknown>(
    (node, key) =>
      node && typeof node === 'object'
        ? (node as Record<string | number, unknown>)[key]
        : undefined,
    value,
  )

const LABEL_KEYS = ['app.kubernetes.io/name', 'app']

export function analyseKubernetes(text: string): Analysis<K8sFacts> {
  const { docs, lines, syntax } = parseYaml(text)
  const findings: Finding[] = [...syntax]
  const facts: K8sFacts = { resources: [] }
  if (syntax.some((finding) => finding.severity === 'error')) return { findings, facts }

  const podLabels: { labels: Record<string, string>; namespace: string | undefined }[] = []
  const services: { doc: Document.Parsed; data: Record<string, unknown> }[] = []

  for (const doc of docs) {
    const data = doc.toJS() as unknown
    if (!isMapping(data)) continue
    const at = (path: Path, key = false) => lineAt(doc, lines, path, key)
    const add = (finding: Omit<Finding, 'line'> & { path: Path; key?: boolean }) => {
      const { path, key, ...rest } = finding
      findings.push({ ...rest, line: at(path, key) })
    }
    const kind = String(data.kind ?? '')
    const name = String(get(data, ['metadata', 'name']) ?? '(unnamed)')
    const label = `${kind} ${name}`

    if (!data.apiVersion || !data.kind) {
      add({
        rule: 'K8S000',
        severity: 'error',
        title: 'Missing apiVersion or kind',
        message: 'Every manifest needs apiVersion and kind so the API server knows what it is.',
        path: [],
      })
      continue
    }
    const replacement = REMOVED_APIS[String(data.apiVersion)]
    if (replacement) {
      add({
        rule: 'K8S001',
        severity: 'error',
        title: `${data.apiVersion} is no longer served`,
        message: `Current Kubernetes versions (including every supported AKS version) reject ${data.apiVersion}. Use ${replacement}.`,
        path: ['apiVersion'],
        fix: { snippet: `apiVersion: ${replacement.split(' ')[0]}`, language: 'yaml' },
      })
    }
    if (kind === 'Service') services.push({ doc, data })

    const podPath = POD_SPEC[kind]
    if (!podPath) continue
    const pod = get(data, podPath)
    if (!isMapping(pod)) {
      add({
        rule: 'K8S002',
        severity: 'error',
        title: `${label} has no pod spec`,
        message: `A ${kind} needs ${podPath.join('.')} with its containers.`,
        path: podPath.slice(0, -1),
      })
      continue
    }

    // Labels and selectors.
    const metadataLabels = get(data, ['metadata', 'labels'])
    if (!isMapping(metadataLabels) || !LABEL_KEYS.some((key) => key in metadataLabels)) {
      add({
        rule: 'K8S003',
        severity: 'warning',
        title: `${label} has no app label`,
        message:
          'Without app.kubernetes.io/name (or app) tools, dashboards and selectors cannot tell what this belongs to.',
        path: ['metadata'],
        fix: {
          snippet: `metadata:\n  name: ${name}\n  labels:\n    app.kubernetes.io/name: ${name}`,
          language: 'yaml',
        },
      })
    }
    const templatePath = podPath.slice(0, -1)
    const templateLabels =
      kind === 'Pod' ? metadataLabels : get(data, [...templatePath, 'metadata', 'labels'])
    if (kind !== 'Pod') {
      if (!isMapping(templateLabels) || Object.keys(templateLabels).length === 0) {
        add({
          rule: 'K8S004',
          severity: 'error',
          title: `${label}: pod template has no labels`,
          message:
            "The controller finds its pods by label. Give the template's metadata the labels the selector matches.",
          path: templatePath,
        })
      }
      const selector = get(data, ['spec', 'selector', 'matchLabels'])
      if (['Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet'].includes(kind)) {
        if (!isMapping(selector)) {
          add({
            rule: 'K8S005',
            severity: 'error',
            title: `${label} has no selector`,
            message: `apps/v1 ${kind}s require spec.selector.matchLabels.`,
            path: ['spec'],
          })
        } else if (isMapping(templateLabels)) {
          const mismatched = Object.entries(selector).filter(
            ([key, value]) => templateLabels[key] !== value,
          )
          if (mismatched.length > 0) {
            add({
              rule: 'K8S006',
              severity: 'error',
              title: `${label}: selector does not match the pod labels`,
              message: `The API server rejects this: selector ${mismatched.map(([key, value]) => `${key}=${value}`).join(', ')} is not in the template labels. The selector must be a subset of them.`,
              path: ['spec', 'selector', 'matchLabels'],
              fix: {
                snippet: `spec:\n  selector:\n    matchLabels:\n      app.kubernetes.io/name: ${name}\n  template:\n    metadata:\n      labels:\n        app.kubernetes.io/name: ${name}`,
                language: 'yaml',
              },
            })
          }
        }
      }
    }
    if (isMapping(templateLabels))
      podLabels.push({
        labels: templateLabels as Record<string, string>,
        namespace: get(data, ['metadata', 'namespace']) as string | undefined,
      })

    // Pod-level security.
    for (const field of ['hostNetwork', 'hostPID', 'hostIPC'] as const) {
      if (pod[field] === true) {
        add({
          rule: 'K8S007',
          severity: 'error',
          title: `${field}: true`,
          message: `${label} shares the node's ${field.slice(4).toLowerCase()} namespace, so a compromised container can see (and reach) everything on the node.`,
          path: [...podPath, field],
        })
      }
    }
    const volumes = Array.isArray(pod.volumes) ? (pod.volumes as Record<string, unknown>[]) : []
    volumes.forEach((volume, index) => {
      if (isMapping(volume) && volume.hostPath) {
        add({
          rule: 'K8S008',
          severity: 'error',
          title: `hostPath volume '${volume.name}'`,
          message:
            "A hostPath mount gives the pod direct access to the node's filesystem - a common route to taking over the node. Use a PersistentVolumeClaim, emptyDir, a ConfigMap or a Secret.",
          path: [...podPath, 'volumes', index, 'hostPath'],
          fix: {
            snippet: `volumes:\n  - name: ${volume.name}\n    persistentVolumeClaim:\n      claimName: ${volume.name}-data\n# or, for scratch space:\n#   emptyDir: {}`,
            language: 'yaml',
          },
        })
      }
    })
    const podSecurity = isMapping(pod.securityContext) ? pod.securityContext : {}

    const containers: { name: string; image: string }[] = []
    const isBatch = kind === 'Job' || kind === 'CronJob'
    for (const group of ['initContainers', 'containers'] as const) {
      const list = Array.isArray(pod[group]) ? (pod[group] as Record<string, unknown>[]) : []
      if (group === 'containers' && list.length === 0) {
        add({
          rule: 'K8S009',
          severity: 'error',
          title: `${label} has no containers`,
          message: 'A pod needs at least one container.',
          path: podPath,
        })
      }
      list.forEach((container, index) => {
        if (!isMapping(container)) return
        const cPath: Path = [...podPath, group, index]
        const cName = String(container.name ?? `#${index + 1}`)
        const who = `Container '${cName}'`
        const image = String(container.image ?? '')
        containers.push({ name: cName, image })

        // Image.
        if (!image) {
          add({
            rule: 'K8S010',
            severity: 'error',
            title: `${who} has no image`,
            message: 'Every container needs an image.',
            path: cPath,
          })
        } else {
          const [reference, digest] = image.split('@')
          const tag = reference.slice(reference.lastIndexOf('/') + 1).split(':')[1]
          if (!digest && (!tag || tag === 'latest')) {
            add({
              rule: 'K8S011',
              severity: 'error',
              title: `${who} uses ${tag ? ':latest' : 'an untagged image'}`,
              message:
                'Nodes may run different builds of the "same" image, and a restart can silently upgrade it. Use a specific tag - or a digest.',
              path: [...cPath, 'image'],
              fix: { snippet: `image: ${reference.split(':')[0]}:1.4.2`, language: 'yaml' },
            })
          } else if (!digest) {
            add({
              rule: 'K8S012',
              severity: 'info',
              title: `${who}: image not pinned by digest`,
              message: `Tags can be overwritten. Pinning ${image}@sha256:… guarantees exactly the image you tested runs.`,
              path: [...cPath, 'image'],
              fix: {
                snippet: `image: ${image}@sha256:<digest>   # az acr repository show-manifests / docker buildx imagetools inspect`,
                language: 'yaml',
              },
            })
          }
        }

        // Resources.
        const resources = isMapping(container.resources) ? container.resources : {}
        const limits = isMapping(resources.limits) ? resources.limits : {}
        const requests = isMapping(resources.requests) ? resources.requests : {}
        if (!limits.memory) {
          add({
            rule: 'K8S013',
            severity: 'warning',
            title: `${who} has no memory limit`,
            message:
              'Without a memory limit one leaking container can use all of the node, and the kernel starts killing other pods. Set a limit (and a request) for every container.',
            path: container.resources ? [...cPath, 'resources'] : cPath,
            fix: {
              snippet:
                'resources:\n  requests:\n    cpu: 100m\n    memory: 128Mi\n  limits:\n    memory: 256Mi',
              language: 'yaml',
            },
          })
        }
        if (!requests.cpu || !requests.memory) {
          add({
            rule: 'K8S014',
            severity: 'warning',
            title: `${who} has no resource requests`,
            message:
              'The scheduler places pods by their requests. Without them it can pack a node until everything on it is starved.',
            path: container.resources ? [...cPath, 'resources'] : cPath,
          })
        }

        // Probes (long-running containers only).
        if (group === 'containers' && !isBatch) {
          if (!container.readinessProbe) {
            add({
              rule: 'K8S015',
              severity: 'warning',
              title: `${who} has no readiness probe`,
              message:
                'Without one, the pod receives traffic as soon as the process starts - before it can answer - and keeps receiving it when it cannot.',
              path: cPath,
              fix: {
                snippet:
                  'readinessProbe:\n  httpGet:\n    path: /health/ready\n    port: 8080\n  periodSeconds: 5',
                language: 'yaml',
              },
            })
          }
          if (!container.livenessProbe) {
            add({
              rule: 'K8S016',
              severity: 'warning',
              title: `${who} has no liveness probe`,
              message:
                'Kubernetes cannot tell a deadlocked process from a working one, so it never restarts it.',
              path: cPath,
              fix: {
                snippet:
                  'livenessProbe:\n  httpGet:\n    path: /health/live\n    port: 8080\n  initialDelaySeconds: 10\n  periodSeconds: 10',
                language: 'yaml',
              },
            })
          }
        }

        // Container security.
        const security = isMapping(container.securityContext) ? container.securityContext : {}
        const sPath: Path = container.securityContext ? [...cPath, 'securityContext'] : cPath
        if (security.privileged === true) {
          add({
            rule: 'K8S017',
            severity: 'error',
            title: `${who} is privileged`,
            message:
              "A privileged container has all of the host's devices and capabilities - effectively root on the node.",
            path: [...cPath, 'securityContext', 'privileged'],
          })
        }
        if (security.allowPrivilegeEscalation !== false) {
          add({
            rule: 'K8S018',
            severity: 'warning',
            title: `${who} allows privilege escalation`,
            message:
              'Set allowPrivilegeEscalation: false so a process cannot gain more privileges than its parent (setuid binaries, for example).',
            path: sPath,
            fix: {
              snippet:
                'securityContext:\n  allowPrivilegeEscalation: false\n  runAsNonRoot: true\n  readOnlyRootFilesystem: true\n  capabilities:\n    drop: ["ALL"]',
              language: 'yaml',
            },
          })
        }
        const runAsUser = security.runAsUser ?? podSecurity.runAsUser
        const nonRoot = security.runAsNonRoot ?? podSecurity.runAsNonRoot
        if (runAsUser === 0) {
          add({
            rule: 'K8S019',
            severity: 'error',
            title: `${who} runs as root (runAsUser: 0)`,
            message: 'Running as UID 0 turns any container escape into root on the node.',
            path:
              security.runAsUser !== undefined
                ? [...cPath, 'securityContext', 'runAsUser']
                : [...podPath, 'securityContext', 'runAsUser'],
          })
        } else if (nonRoot !== true) {
          add({
            rule: 'K8S020',
            severity: 'warning',
            title: `${who} may run as root`,
            message:
              'Set runAsNonRoot: true (pod or container securityContext) so the kubelet refuses to start the container as root.',
            path: sPath,
          })
        }
        if (security.readOnlyRootFilesystem !== true) {
          add({
            rule: 'K8S021',
            severity: 'info',
            title: `${who}: writable root filesystem`,
            message:
              'readOnlyRootFilesystem: true stops an attacker writing tools into the container. Mount an emptyDir for paths that must be writable.',
            path: sPath,
          })
        }
        const caps = isMapping(security.capabilities) ? security.capabilities : {}
        if (!Array.isArray(caps.drop) || !caps.drop.map(String).includes('ALL')) {
          add({
            rule: 'K8S022',
            severity: 'info',
            title: `${who} keeps default capabilities`,
            message:
              'Drop all Linux capabilities and add back only what is needed (e.g. NET_BIND_SERVICE).',
            path: sPath,
          })
        }
      })
    }

    if (!get(data, ['metadata', 'namespace'])) {
      add({
        rule: 'K8S023',
        severity: 'info',
        title: `${label} has no namespace`,
        message:
          'It will land in whatever namespace kubectl is pointed at - usually default. Set metadata.namespace (or apply with -n).',
        path: ['metadata'],
      })
    }
    const replicas =
      typeof get(data, ['spec', 'replicas']) === 'number'
        ? (get(data, ['spec', 'replicas']) as number)
        : null
    if (kind === 'Deployment' && (replicas === null || replicas < 2)) {
      add({
        rule: 'K8S024',
        severity: 'info',
        title: `${label} runs a single replica`,
        message:
          'One replica means downtime on every node drain, upgrade or crash. Run at least 2 (and add a PodDisruptionBudget).',
        path: get(data, ['spec', 'replicas']) !== undefined ? ['spec', 'replicas'] : ['spec'],
      })
    }
    facts.resources.push({ kind, name, containers, replicas })
  }

  // Services that select nothing in this file.
  if (podLabels.length > 0) {
    for (const { doc, data } of services) {
      const selector = get(data, ['spec', 'selector'])
      if (!isMapping(selector)) continue
      const matches = podLabels.some(({ labels }) =>
        Object.entries(selector).every(([key, value]) => labels[key] === value),
      )
      if (!matches) {
        findings.push({
          rule: 'K8S025',
          severity: 'warning',
          title: `Service ${get(data, ['metadata', 'name'])} selects no pods`,
          message: `No pod template in this file has the labels ${Object.entries(selector)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ')}, so the Service would have no endpoints and every request would fail.`,
          line: lineAt(doc, lines, ['spec', 'selector']),
        })
      }
    }
    for (const { data } of services)
      facts.resources.push({
        kind: 'Service',
        name: String(get(data, ['metadata', 'name'])),
        containers: [],
        replicas: null,
      })
  } else {
    for (const { data } of services)
      facts.resources.push({
        kind: 'Service',
        name: String(get(data, ['metadata', 'name'])),
        containers: [],
        replicas: null,
      })
  }
  return { findings, facts }
}
