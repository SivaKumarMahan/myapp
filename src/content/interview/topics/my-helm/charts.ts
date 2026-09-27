import type { InterviewQuestion } from '../../../types'

/** Helm fundamentals, chart structure, values, dependencies and repositories (questions.md, notes.md, summary.md). */
export const myHelmChartQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myhelm-1',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Helm and how does it simplify Kubernetes deployments?',
    probing:
      'Whether you know Helm is packaging plus release management on top of Kubernetes, not a replacement for it.',
    answer: [
      'Helm is a package manager and release-management tool for Kubernetes. A chart packages up templates, default values, metadata, and dependencies. When you install a chart, Helm renders it into Kubernetes manifests and creates a named "release" whose history it tracks.',
      'Instead of keeping separate copies of Deployment, Service, Ingress, HPA, and ConfigMap files for every environment, I keep one chart and override just the values that need to change:',
      "I check the rendered YAML and policies, pin chart and image versions, watch the rollout and application health, and keep enough history to roll back. Helm's job is packaging and configuration — Kubernetes itself still does the actual rollout and self-healing.",
      '**What Helm Is:** Helm is a package manager for Kubernetes. It packages related Kubernetes manifests into reusable charts and manages installed chart instances as releases. Helm helps teams:',
      '- Deploy multiple Kubernetes resources with one command\n- Reuse templates across applications and environments\n- Override configuration without copying manifests\n- Track release revisions\n- Upgrade or roll back deployments\n- Package and distribute application definitions',
      'Helm does not replace Kubernetes. It renders Kubernetes YAML and submits it to the Kubernetes API.',
      '**Chart, Release, and Repository**',
      '- **Chart:** A versioned package containing templates, default values, metadata, and optional dependencies.\n- **Release:** One installed instance of a chart in a Kubernetes cluster.\n- **Repository:** A location where packaged charts and their index are published.',
      'The same chart can be installed more than once using different release names and values.',
    ],
    code: [
      {
        title: 'Lint, render and install a chart',
        language: 'bash',
        code: `helm lint ./chart
helm template orders ./chart -f values-prod.yaml
helm upgrade --install orders ./chart \\
  -n orders --create-namespace \\
  -f values-prod.yaml --atomic --wait --timeout 5m`,
      },
    ],
    tags: ['helm', 'charts', 'releases'],
  },
  {
    id: 'itv-myhelm-2',
    level: 'basic',
    kind: 'open',
    prompt:
      'Explain the folder structure of a Helm chart, the purpose of each file, and the commands used to release it.',
    probing:
      'Whether you can name what each chart file does and walk through create, lint, template, install, history and rollback.',
    answer: [
      'A chart has `Chart.yaml` for metadata, a default `values.yaml`, templates under `templates/`, and optionally a values schema, tests, dependencies, and documentation. `_helpers.tpl` holds reusable names and labels; templates should render valid Kubernetes objects without hiding important behavior of the workload.',
      'CI validates the values schema, renders every supported environment, runs Kubernetes schema and policy checks, packages a versioned chart, and signs and publishes it. Production then deploys that exact same chart and image that were already tested, and verifies the rollout, probes, logs, metrics, and a real transaction afterward.',
      "A Helm chart has a specific folder structure that organizes the files and templates needed to deploy applications on Kubernetes. Here's an overview of the typical folder structure of a Helm chart:",
      "Here's a brief explanation of each folder/file:",
      '1. **`Chart.yaml`:** This file contains metadata about the chart, such as its name, version, description, and maintainers. It is essential for Helm to identify and manage the chart.\n2. **`values.yaml`:** This file contains the default configuration values for the chart. Users can override these values when deploying the chart to customize the deployment.\n3. **`charts/`:** This directory is used to store any dependent charts that your chart relies on. These dependencies can be other Helm charts that are packaged together with your main chart.\n4. **`templates/`:** This directory contains the Kubernetes manifest templates that Helm uses to generate the final YAML files for deployment. These templates can include Deployments, Services, Ingresses, and other Kubernetes resources. The templates can use Go templating syntax to allow for dynamic configuration based on the values provided in `values.yaml` or during deployment. **`deployment.yaml`:** Template for creating a Kubernetes Deployment resource. **`service.yaml`:** Template for creating a Kubernetes Service resource. **`ingress.yaml`:** Template for creating a Kubernetes Ingress resource. **`_helpers.tpl`:** A file that contains helper template functions that can be reused across other templates. **`hpa.yaml`:** Template for creating a Horizontal Pod Autoscaler resource. **`NOTES.txt`:** A file that provides post-installation instructions or notes to the user after the chart is deployed.\n5. **`.helmignore`:** This file specifies patterns for files and directories that should be ignored when packaging the chart. It works similarly to a `.gitignore` file.',
      'To deploy Helm charts, you can use the following commands:',
      '1. `helm install <release-name> <chart-path>`: This command installs a Helm chart into your Kubernetes cluster. Replace `<release-name>` with a name for your deployment and `<chart-path>` with the path to your chart.\n2. `helm upgrade <release-name> <chart-path>`: This command upgrades an existing release with a new version of the chart.\n3. `helm uninstall <release-name>`: This command removes a deployed Helm release from the cluster.\n4. `helm repo add <repo-name> <repo-url>`: This command adds a Helm chart repository.\n5. `helm repo update`: This command updates the local cache of chart repositories.\n6. `helm list`: This command lists all the deployed Helm releases in the cluster.',
      "Helm relies on the Kubernetes Deployment's own rolling update strategy. When you upgrade a release, Kubernetes rolls out the new pods and only terminates the old ones once the new ones are Ready — so there's no downtime in between.",
      '- **`Chart.yaml`**: Chart metadata, chart version, application version, and dependencies\n- **`values.yaml`**: Default configuration values consumed by templates\n- **`values.schema.json`**: Optional schema used to validate supplied values\n- **`charts/`**: Downloaded or packaged chart dependencies\n- **`crds/`**: Custom Resource Definitions installed before normal templates\n- **`templates/`**: Go-templated Kubernetes manifests\n- **`_helpers.tpl`**: Reusable named templates and helper functions\n- **`NOTES.txt`**: Instructions displayed after install or upgrade\n- **`templates/tests/`**: Optional resources used by `helm test`\n- **`.helmignore`**: Files excluded when packaging the chart\n- **`LICENSE`**: Chart licensing information\n- **`README.md`**: Chart usage and configuration documentation',
      '`Chart.yaml` uses `version` for the chart package and `appVersion` as informational metadata about the packaged application version.',
    ],
    code: [
      {
        title: 'Create, validate and release a chart',
        language: 'bash',
        code: `helm create payments
helm dependency update ./payments
helm lint ./payments
helm template payments ./payments -f values-dev.yaml
helm upgrade --install payments ./payments \\
  --namespace payments --create-namespace \\
  --values values-prod.yaml --atomic --wait
helm history payments -n payments
helm rollback payments <revision> -n payments`,
      },
      {
        title: 'Chart folder layout',
        language: 'text',
        code: `mychart/
│
├── Chart.yaml
├── values.yaml
│
├── charts/
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── _helpers.tpl
│   ├── hpa.yaml
│   ├── NOTES.txt
│
└── .helmignore`,
      },
      {
        title: 'Chart folder layout with schema, CRDs and tests',
        language: 'text',
        code: `mychart/
├── Chart.yaml
├── values.yaml
├── values.schema.json
├── charts/
├── crds/
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── _helpers.tpl
│   ├── NOTES.txt
│   └── tests/
├── .helmignore
├── LICENSE
└── README.md`,
      },
    ],
    tags: ['helm', 'chart structure'],
  },
  {
    id: 'itv-myhelm-3',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the standard Helm workflow, and which commands do you use at each step?',
    probing:
      'Whether you have a repeatable command flow and understand what --wait and --atomic actually do.',
    answer: [
      '**Render and Validate Templates:** Rendering locally is useful for reviewing generated manifests before they reach the cluster.',
      '**Install and Upgrade**',
      '- `upgrade --install` makes the command usable for both first deployment and later updates.\n- `--wait` waits for supported resources to become ready.\n- `--atomic` removes a failed install or rolls back a failed upgrade and implies `--wait`.',
      'Kubernetes controllers perform the underlying rollout. Helm waits or rolls back according to the selected flags; Helm itself does not guarantee zero downtime.',
    ],
    code: [
      {
        title: 'Create and inspect a chart',
        language: 'bash',
        code: `helm create mychart
helm lint ./mychart
helm show chart ./mychart
helm show values ./mychart`,
      },
      {
        title: 'Render and validate templates',
        language: 'bash',
        code: `helm template my-release ./mychart -f values-dev.yaml
helm install my-release ./mychart -f values-dev.yaml --dry-run --debug`,
      },
      {
        title: 'Install or upgrade in one command',
        language: 'bash',
        code: `helm upgrade --install my-release ./mychart \\
  --namespace my-app \\
  --create-namespace \\
  -f values-prod.yaml \\
  --wait \\
  --atomic`,
      },
      {
        title: 'Release history and rollback',
        language: 'bash',
        code: `helm list --all-namespaces
helm status my-release
helm history my-release
helm rollback my-release <revision> --wait
helm get all my-release`,
      },
      {
        title: 'Test and uninstall',
        language: 'bash',
        code: `helm test my-release
helm uninstall my-release`,
      },
    ],
    tags: ['helm', 'commands'],
  },
  {
    id: 'itv-myhelm-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do values and Go templating work in a Helm chart?',
    probing:
      'Whether you can connect values.yaml to rendered manifests and know the built-in objects and helper functions.',
    answer: [
      'Templates use values to generate environment-specific Kubernetes manifests.',
      'Common template objects include `.Values`, `.Chart`, `.Release`, `.Capabilities`, and `.Files`.',
      'Use helpers in `_helpers.tpl` for consistent names, labels, and repeated template logic. Use `required`, `default`, `quote`, `toYaml`, `include`, `tpl`, and indentation functions carefully.',
    ],
    code: [
      {
        title: 'values.yaml',
        language: 'yaml',
        code: `# values.yaml
replicaCount: 2

image:
  repository: example/app
  tag: "1.0.0"

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi`,
      },
      {
        title: 'templates/deployment.yaml',
        language: 'yaml',
        code: `# templates/deployment.yaml
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          resources:
            {{- toYaml .Values.resources | nindent 12 }}`,
      },
    ],
    tags: ['helm', 'templating', 'values'],
  },
  {
    id: 'itv-myhelm-5',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you use one shared chart for many microservices without making it unmanageable?',
    probing:
      'Whether you can standardise with a library or base chart while keeping per-service ownership and lifecycles.',
    answer: [
      'A library or reusable application chart can standardize labels, probes, security contexts, and deployment patterns. Each service supplies its own values.',
      'Avoid one large chart with excessive conditionals when services have very different lifecycles. Separate charts or a library chart can preserve independent ownership and releases.',
    ],
    code: [
      {
        title: 'Per-service values in a shared chart',
        language: 'yaml',
        code: `services:
  orders:
    resources:
      requests: { cpu: 200m, memory: 256Mi }
  payments:
    resources:
      requests: { cpu: 500m, memory: 512Mi }
  default:
    resources:
      requests: { cpu: 100m, memory: 128Mi }`,
      },
    ],
    tags: ['helm', 'library charts', 'microservices'],
  },
  {
    id: 'itv-myhelm-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are chart dependencies and umbrella charts, and what is the trade-off?',
    probing:
      'Whether you understand coordinated versioning versus release coupling for independently deployed services.',
    answer: [
      'An umbrella chart groups multiple child charts as dependencies and provides one entry point for deploying an application stack.',
      'Umbrella charts provide coordinated versioning and installation. The trade-off is tighter release coupling, so independently deployed microservices may be better managed as separate releases through GitOps.',
    ],
    code: [
      {
        title: 'Umbrella chart Chart.yaml',
        language: 'yaml',
        code: `# Chart.yaml
apiVersion: v2
name: shop
version: 1.0.0
dependencies:
  - name: frontend
    version: 1.2.0
    repository: file://charts/frontend
  - name: backend
    version: 2.1.0
    repository: file://charts/backend
  - name: postgresql
    version: 15.5.0
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled`,
      },
      {
        title: 'Fetch and build dependencies',
        language: 'bash',
        code: `helm dependency update ./shop
helm dependency build ./shop`,
      },
    ],
    tags: ['helm', 'dependencies', 'umbrella charts'],
  },
  {
    id: 'itv-myhelm-7',
    level: 'basic',
    kind: 'open',
    prompt: 'How do Helm chart repositories and OCI registries work?',
    probing:
      'Whether you know both the classic index-based repositories and pushing and pulling charts from an OCI registry.',
    answer: [
      'Traditional repository commands:',
      'Helm can also store charts in OCI-compatible registries:',
    ],
    code: [
      {
        title: 'Classic chart repository commands',
        language: 'bash',
        code: `helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm search repo nginx
helm pull bitnami/nginx
helm package ./mychart`,
      },
      {
        title: 'Charts in an OCI registry',
        language: 'bash',
        code: `helm registry login <registry>
helm push mychart-1.0.0.tgz oci://<registry>/charts
helm pull oci://<registry>/charts/mychart --version 1.0.0`,
      },
    ],
    tags: ['helm', 'repositories', 'oci'],
  },
  {
    id: 'itv-myhelm-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does Helm compare with a Kubernetes Operator, and can you use them together?',
    probing:
      'Whether you can separate one-shot rendering and release management from a controller that reconciles continuously.',
    answer: [
      '- **Helm**: Packages and renders resources | **Operator**: Runs a controller that continuously reconciles the cluster — keeping its actual state matched to the desired state\n- **Helm**: Strong for install, upgrade, and rollback | **Operator**: Strong for continuous application-specific operations\n- **Helm**: Usually reacts when a user or pipeline runs Helm | **Operator**: Continuously watches custom resources and cluster state\n- **Helm**: Suitable for most application deployments | **Operator**: Suitable for complex lifecycle automation such as databases',
      'They can be used together: Helm can install an Operator and its supporting resources.',
    ],
    tags: ['helm', 'operators'],
  },
  {
    id: 'itv-myhelm-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which Helm projects can you describe from your own experience?',
    probing:
      'Whether you can talk through real charts end to end, including validation, rollback and production gaps.',
    answer: [
      '**1. Full-stack To-Do application**',
      '- Containerize the frontend and backend separately, and publish each one to Azure Container Registry under a fixed image digest that never changes.\n- Use one reusable chart, or a small number of clearly separated charts, for Deployments, Services, ConfigMaps, external secrets, probes, resource limits, and Ingress.\n- Keep Dev, QA, and Production values separate, while reusing the same chart version across all of them.\n- Validate with `helm lint`, `helm template`, and a server-side dry run before running `helm upgrade --install`.\n- Use `--atomic --wait --timeout 5m`, then check the rollout status and run a business-level smoke test.\n- Roll back to a known Helm revision only after checking that any database or external dependency changes are backward-compatible with it.',
      '**2. Node.js To-Do application:** The chart exposes the application through a Service and includes startup/readiness/liveness probes so Kubernetes does not send traffic before the application is ready. A NodePort can be used for learning, but production normally uses Ingress or a LoadBalancer with TLS, authentication, and controlled network exposure.',
      '**3. Jenkins on Kubernetes:** Jenkins can be installed from a chart with persistent storage for the controller and ephemeral Kubernetes agents for builds.',
      'PersistentVolume backup, plugin/version pinning, credentials, security context, resource limits, controller recovery, and chart upgrade tests must be planned before treating this as a production installation.',
      '**4. Helmfile:** Helmfile coordinates multiple Helm releases and their environment values declaratively. I use it when several related releases need to be installed in a known order, while still pinning chart versions, keeping secrets separate, reviewing rendered changes, and verifying each release.',
      "For keeping a cluster's actual state continuously matched to its desired state across many clusters, a GitOps tool like Argo CD or Flux is often a better fit than running Helmfile by hand.",
    ],
    tags: ['helm', 'projects', 'helmfile'],
  },
  {
    id: 'itv-myhelm-10',
    level: 'basic',
    kind: 'open',
    prompt: 'What should you revise before a Helm interview?',
    probing:
      'Whether you have covered the full Helm surface: structure, values, lifecycle, security, GitOps and troubleshooting.',
    answer: [
      'These are the areas I revise before a Helm interview:',
      '- Helm chart, release, repository, and revision\n- Chart directory structure\n- Values precedence and Go templating\n- Install, upgrade, rollback, test, and uninstall\n- `--wait`, `--atomic`, and dry runs\n- Multi-environment values management\n- Reusable charts and per-service configuration\n- Dependencies and umbrella charts\n- Repositories and OCI registries\n- Hooks and lifecycle behavior\n- Secret management and chart signing\n- Helm vs. Operators\n- CI/CD, GitOps, monitoring, and troubleshooting',
    ],
    tags: ['helm', 'revision'],
  },
]
