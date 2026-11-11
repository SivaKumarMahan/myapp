// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k8sScenarioById } from '../../content/k8slab'
import { checkScenario } from './checks'
import { crashCycle, findObject, parseImage, podView, reconcile } from './cluster'
import { jsonpath } from './jsonpath'
import { K8sLab } from './lab'
import { strategicMerge } from './resources'
import { humanAge, table } from './util'

const scenario = (id: string) => {
  const found = k8sScenarioById.get(id)
  if (!found) throw new Error(id)
  return found
}

describe('helpers', () => {
  it('formats ages like kubectl', () => {
    expect(humanAge(45)).toBe('45s')
    expect(humanAge(125)).toBe('2m5s')
    expect(humanAge(900)).toBe('15m')
    expect(humanAge(3 * 3600 + 120)).toBe('3h2m')
    expect(humanAge(3 * 24 * 3600)).toBe('3d')
  })

  it('pads tables with three spaces', () => {
    expect(
      table([
        ['NAME', 'READY'],
        ['web-1', '1/1'],
      ]),
    ).toBe('NAME    READY\nweb-1   1/1')
  })

  it('parses image references', () => {
    expect(parseImage('nginx')?.full).toBe('docker.io/library/nginx:latest')
    expect(parseImage('acrshoplab.azurecr.io/shop/storefront:2.4.1')?.repo).toBe(
      'acrshoplab.azurecr.io/shop/storefront',
    )
    expect(parseImage('Bad Image')).toBeNull()
  })

  it('restarts crashing containers with back-off', () => {
    expect(crashCycle(0, 5, 1)).toMatchObject({ running: false, restarts: 0 })
    expect(crashCycle(0, 900, 1).restarts).toBeGreaterThan(4)
    expect(crashCycle(0, 900, 1).restarts).toBeLessThan(10)
  })

  it('evaluates jsonpath with ranges and filters', () => {
    const doc = { items: [{ metadata: { name: 'a' } }, { metadata: { name: 'b' } }] }
    expect(jsonpath(doc, '{.items[*].metadata.name}')).toBe('a b')
    expect(jsonpath(doc, '{range .items[*]}{.metadata.name}{"\\n"}{end}')).toBe('a\nb\n')
    expect(jsonpath(doc, '{.items[?(@.metadata.name=="b")].metadata.name}')).toBe('b')
  })

  it('merges containers by name in a strategic merge patch', () => {
    const merged = strategicMerge(
      {
        containers: [
          { name: 'a', image: 'x' },
          { name: 'b', image: 'y' },
        ],
      },
      { containers: [{ name: 'b', image: 'z' }] },
    ) as { containers: { name: string; image: string }[] }
    expect(merged.containers).toEqual([
      { name: 'a', image: 'x' },
      { name: 'b', image: 'z' },
    ])
  })
})

describe('reconcile and pod status', () => {
  it('derives each broken status from spec and world facts', () => {
    const status = (id: string) => {
      const lab = K8sLab.create(scenario(id))
      const ns = scenario(id).setup.namespace
      return lab.cluster.pods
        .filter((pod) => pod.namespace === ns)
        .map((pod) => podView(lab.cluster, pod).status)
    }
    expect(status('image-tag-typo')).toContain('ImagePullBackOff')
    expect(status('configmap-missing-key')).toEqual([
      'CreateContainerConfigError',
      'CreateContainerConfigError',
    ])
    expect(status('requests-too-big')).toEqual(['Pending', 'Pending'])
    expect(status('pvc-storageclass')).toEqual(['Pending'])
    expect(
      status('bad-command').every((entry) => ['CrashLoopBackOff', 'Error'].includes(entry)),
    ).toBe(true)
    expect(
      status('oom-killed').every((entry) =>
        ['CrashLoopBackOff', 'OOMKilled', 'Running'].includes(entry),
      ),
    ).toBe(true)
  })

  it('keeps old Pods serving while a bad rolling update is stuck', () => {
    const lab = K8sLab.create(scenario('bad-rollout-undo'))
    const views = lab.cluster.pods
      .filter((pod) => pod.namespace === 'cart')
      .map((pod) => podView(lab.cluster, pod))
    expect(views.filter((view) => view.ready)).toHaveLength(3)
    expect(views.filter((view) => !view.ready)).toHaveLength(2)
  })

  it('orphans Pods whose labels stop matching their ReplicaSet, and replaces them', () => {
    const lab = K8sLab.create(scenario('service-selector'))
    lab.run('kubectl label pods -l app=checkout app=checkout-api --overwrite')
    reconcile(lab.cluster)
    const pods = lab.cluster.pods.filter((pod) => pod.namespace === 'checkout')
    expect(pods).toHaveLength(4)
    expect(pods.filter((pod) => pod.owner === null)).toHaveLength(2)
  })

  it('schedules a Pending Pod once its claim can bind', () => {
    const lab = K8sLab.create(scenario('pvc-storageclass'))
    lab.writeFile('pvc.yaml', scenario('pvc-storageclass').solution.files?.[0].content ?? '')
    expect(lab.run('kubectl delete pvc wiki-data').stdout).toBe(
      'persistentvolumeclaim "wiki-data" deleted from docs namespace\n',
    )
    expect(lab.run('kubectl apply -f pvc.yaml').stdout).toBe(
      'persistentvolumeclaim/wiki-data created\n',
    )
    expect(lab.run('kubectl get pvc').stdout).toMatch(/wiki-data\s+Bound\s+pvc-/)
  })
})

describe('kubectl output', () => {
  it('prints get tables, wide columns and the Endpoints deprecation warning', () => {
    const lab = K8sLab.create(scenario('service-targetport'))
    expect(lab.run('kubectl get deploy').stdout).toMatch(
      /^NAME\s+READY\s+UP-TO-DATE\s+AVAILABLE\s+AGE\ninventory\s+2\/2\s+2\s+2\s+15m/,
    )
    expect(lab.run('kubectl get pods -o wide').stdout).toMatch(
      /IP\s+NODE\s+NOMINATED NODE\s+READINESS GATES/,
    )
    const endpoints = lab.run('kubectl get endpoints inventory')
    expect(endpoints.stderr).toContain('v1 Endpoints is deprecated')
    expect(endpoints.stdout).toMatch(/:8080/)
  })

  it("describes a Pending Pod with the scheduler's reasons", () => {
    const lab = K8sLab.create(scenario('taint-toleration'))
    const text = lab.run('kubectl describe pod image-tagger').stdout
    expect(text).toContain(
      "0/4 nodes are available: 1 node(s) had untolerated taint {sku: gpu}, 3 node(s) didn't match Pod's node affinity/selector.",
    )
    expect(text).toMatch(/Warning\s+FailedScheduling/)
  })

  it('shows current and previous logs, and explains waiting containers', () => {
    const lab = K8sLab.create(scenario('bad-command'))
    expect(lab.run('kubectl logs deploy/notifier --previous').stdout).toContain(
      "Error: Cannot find module '/app/server.js'",
    )
    const waiting = K8sLab.create(scenario('configmap-missing-key')).run(
      'kubectl logs deploy/orders-api',
    )
    expect(waiting.exitCode).toBe(1)
    expect(waiting.stderr).toContain('is waiting to start: CreateContainerConfigError')
    const oom = K8sLab.create(scenario('oom-killed')).run('kubectl describe pod report-worker')
    expect(oom.stdout).toMatch(/Reason:\s+OOMKilled\n\s+Exit Code:\s+137/)
  })

  it('answers HTTP through the ingress like ingress-nginx', () => {
    expect(
      K8sLab.create(scenario('ingress-no-class')).run(
        'curl -s -o /dev/null -w "%{http_code}" http://blog.example.com/',
      ).stdout,
    ).toBe('404')
    expect(
      K8sLab.create(scenario('ingress-backend-503')).run('curl -i http://api.example.com/users')
        .stdout,
    ).toMatch(/^HTTP\/1\.1 503 Service Temporarily Unavailable/)
    expect(
      K8sLab.create(scenario('service-targetport')).run('curl -I http://stock.example.com/').stdout,
    ).toMatch(/^HTTP\/1\.1 502 Bad Gateway/)
    expect(
      K8sLab.create(scenario('ingress-backend-503')).run('curl http://api.example.com/orders')
        .stdout,
    ).toContain('"orders"')
    expect(K8sLab.create(null).run('curl http://example.invalid/').stderr).toBe(
      'curl: (6) Could not resolve host: example.invalid',
    )
  })

  it('curls from inside a Pod with cluster DNS', () => {
    const lab = K8sLab.create(scenario('service-targetport'))
    expect(
      lab.run('kubectl exec deploy/inventory -- curl -s localhost:3000/healthz').stdout,
    ).toContain('"ok"')
    const refused = lab.run('kubectl exec deploy/inventory -- curl -s -S inventory/healthz')
    expect(refused.stderr).toContain("Couldn't connect to server")
    expect(refused.stderr).toContain('command terminated with exit code 7')
  })

  it("rejects immutable changes with the API server's message", () => {
    const lab = K8sLab.create(scenario('pvc-storageclass'))
    const result = lab.run(
      'kubectl patch pvc wiki-data -p \'{"spec":{"storageClassName":"managed-csi"}}\'',
    )
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('spec is immutable after creation')
    const selector = lab.run(
      'kubectl patch deployment wiki -p \'{"spec":{"selector":{"matchLabels":{"app":"x"}}}}\'',
    )
    expect(selector.stderr).toContain('field is immutable')
  })

  it('round-trips get -o yaml > file and apply -f, and refuses edit', () => {
    const lab = K8sLab.create(scenario('readiness-wrong-path'))
    expect(lab.run('kubectl get deploy profile -o yaml > profile.yaml').stdout).toBe('')
    expect(lab.files['profile.yaml']).toContain('path: /readyz')
    lab.writeFile(
      'profile.yaml',
      lab.files['profile.yaml'].replace('path: /readyz', 'path: /ready'),
    )
    expect(lab.run('kubectl apply -f profile.yaml').stdout).toBe(
      'deployment.apps/profile configured\n',
    )
    expect(checkScenario(scenario('readiness-wrong-path'), lab.cluster).passed).toBe(true)
    expect(lab.run('kubectl edit deploy profile').stderr).toContain('interactive editor')
  })

  it('rolls back with rollout undo and records history', () => {
    const lab = K8sLab.create(scenario('bad-rollout-undo'))
    expect(lab.run('kubectl rollout status deployment/cart').exitCode).toBe(1)
    expect(lab.run('kubectl rollout undo deployment/cart').stdout).toBe(
      'deployment.apps/cart rolled back\n',
    )
    expect(lab.run('kubectl rollout status deployment/cart').stdout).toBe(
      'deployment "cart" successfully rolled out\n',
    )
    expect(lab.run('kubectl rollout history deployment/cart').stdout).toMatch(/3\s+Release 1\.8\.0/)
  })

  it('creates docker-registry secrets that the kubelet can use', () => {
    const lab = K8sLab.create(scenario('private-registry-secret'))
    lab.run('kubectl delete secret acr-payments-pull')
    expect(
      lab.run(
        'kubectl create secret docker-registry acr-payments-pull --docker-server=acrpayments.azurecr.io --docker-username=acrpayments-pull --docker-password=lab-pull-token-not-real',
      ).stdout,
    ).toBe('secret/acr-payments-pull created\n')
    lab.run(scenario('private-registry-secret').solution.commands[0])
    expect(checkScenario(scenario('private-registry-secret'), lab.cluster).passed).toBe(true)
  })

  it('switches namespace, pipes into grep and gives helpful errors', () => {
    const lab = K8sLab.create(null)
    expect(lab.run('kubectl config set-context --current --namespace=kube-system').stdout).toBe(
      'Context "aks-lab" modified.\n',
    )
    expect(lab.run('kubectl get pods | grep -c coredns').stdout).toBe('2\n')
    expect(lab.run('kubectl gett pods').stderr).toContain('Did you mean this?\n\tget')
    expect(lab.run('kubectl get foo').stderr).toBe(
      'error: the server doesn\'t have a resource type "foo"',
    )
    expect(lab.run('kubectl get pod nope').stderr).toBe(
      'Error from server (NotFound): pods "nope" not found',
    )
    expect(lab.run('frobnicate').stderr).toContain('command not found')
  })

  it('completes verbs, kinds and names', () => {
    const lab = K8sLab.create(scenario('oom-killed'))
    expect(lab.complete('kubectl rollo').line).toBe('kubectl rollout ')
    expect(lab.complete('kubectl get deploy rep').line).toBe('kubectl get deploy report-worker ')
    expect(lab.complete('kubectl get p').options).toEqual(expect.arrayContaining(['pods', 'pvc']))
  })
})

describe('checks', () => {
  it('explain failures in plain words', () => {
    const lab = K8sLab.create(scenario('service-selector'))
    const report = checkScenario(scenario('service-selector'), lab.cluster)
    const messages = report.results.flatMap((result) => result.messages).join('\n')
    expect(messages).toContain('The Service has no ready endpoints')
    expect(messages).toContain('Got 503')
  })

  it('catch fixes that only hide the symptom', () => {
    const lab = K8sLab.create(scenario('liveness-wrong-port'))
    lab.run(
      'kubectl patch deployment catalog --type json -p \'[{"op":"remove","path":"/spec/template/spec/containers/0/livenessProbe"}]\'',
    )
    const report = checkScenario(scenario('liveness-wrong-port'), lab.cluster)
    expect(report.passed).toBe(false)
    expect(report.results.find((result) => !result.passed)?.messages[0]).toContain(
      'liveness probe was removed',
    )
  })

  it('flag a deleted Deployment', () => {
    const lab = K8sLab.create(scenario('oom-killed'))
    lab.run('kubectl delete deployment report-worker')
    expect(findObject(lab.cluster, 'Deployment', 'report-worker', 'analytics')).toBeUndefined()
    const report = checkScenario(scenario('oom-killed'), lab.cluster)
    expect(report.results[0].messages[0]).toContain('no longer exists')
  })
})
