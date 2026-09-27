import type { InterviewQuestion } from '../../../types'

/** Releasing with Helm: environments, hooks, secrets, signing, rollback, CI/CD and troubleshooting. */
export const myHelmReleaseQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myhelm-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle multi-environment deployments using Helm?',
    probing:
      'Whether you promote one tested chart and image with per-environment values instead of copying charts.',
    answer: [
      'I keep one versioned chart and a separate, non-secret values file per environment:',
      'CI lints the chart, validates its values against a schema, renders every supported environment, runs Kubernetes schema and policy checks, and packages a fixed chart version.',
      'That same application image and chart version get promoted through dev, staging, and production — only the approved values differ between them. Production requires an approval, uses `--atomic --wait`, runs smoke tests, is monitored, and has a documented rollback path. Secrets are always referenced from outside the chart, never stored in it.',
      'I avoid copying whole charts per environment, because fixes then have to be made in multiple places and drift apart. Where a lot of applications share the same pattern, I use a versioned library or base chart, but still let each service set its own resource limits, probes, and scaling.',
      'The idea is simple: one chart version gets promoted through Dev, Staging, and Production, with a separate, reviewed values file for each — `values-dev.yaml`, `values-staging.yaml`, `values-prod.yaml`. Those files only hold non-secret differences between environments; actual secrets come from an external secret manager.',
      'The pipeline validates and renders the chart, deploys the exact same image build to Dev, runs tests, and only then promotes that same chart-and-image combination through the later environments, each behind its own approval.',
      'Every release gets its own namespace and Helm release name, an explicit timeout, a history you can look back at, and a health check after it deploys.',
      'This setup stops values from getting silently overwritten, stops environments from drifting apart, and keeps every release traceable back to what was actually deployed. If a rollback is needed, I go back to the last known-good image and chart combination — but only after checking that the database and any external configuration are still compatible with that older version.',
      'GitOps can replace running the Helm command directly, while keeping the same promotion steps, policy checks, and verification.',
      'Keep one reusable chart and maintain environment-specific value files:',
      'Later values files override earlier ones. Command-line `--set` values have high precedence, but large or important configurations are easier to review in version-controlled values files.',
      'Recommended practices:',
      '- Keep the chart logic common across environments.\n- Store only non-secret environment configuration in values files.\n- Pin chart, dependency, and container-image versions.\n- Promote a tested version instead of editing production independently.\n- Run linting, rendering, schema validation, and policy checks in CI.',
    ],
    code: [
      {
        title: 'Values files per environment',
        language: 'text',
        code: `values.yaml
values-dev.yaml
values-stage.yaml
values-prod.yaml`,
      },
      {
        title: 'Validate, render and deploy to production',
        language: 'bash',
        code: `helm lint ./chart
helm template app ./chart -f values-prod.yaml > rendered.yaml
helm upgrade --install app ./chart \\
  --namespace app-prod --create-namespace \\
  -f values-prod.yaml \\
  --set-string image.digest="$IMAGE_DIGEST" \\
  --atomic --wait --timeout 10m`,
      },
      {
        title: 'Layer base and production values',
        language: 'bash',
        code: `helm upgrade --install app ./chart -f values.yaml -f values-prod.yaml`,
      },
    ],
    tags: ['helm', 'environments', 'promotion'],
  },
  {
    id: 'itv-myhelm-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Helm hooks and how are they used?',
    probing:
      'Whether you know hook annotations, weights and delete policies, and that a rollback does not undo a migration.',
    answer: [
      'Hooks are ordinary Kubernetes resources with a special annotation that tells Helm to run them at a specific point in the release lifecycle — `pre-install`, `post-install`, `pre-upgrade`, `pre-delete`, and so on. Common examples are a migration Job, a validation check, a backup, or a cleanup step.',
      'I make hook Jobs safe to run more than once (idempotent), give them a timeout, use a tightly scoped ServiceAccount, and set a clear cleanup policy. A failing hook can block the whole release, so I check the Job, its pod logs, events, and the hook resource itself when something goes wrong.',
      "Anything as critical as a database migration needs its own explicit compatibility and recovery plan — you shouldn't assume a Helm rollback will undo it for you.",
      'Hooks are annotated Kubernetes resources executed at release lifecycle points such as `pre-install`, `post-install`, `pre-upgrade`, `post-upgrade`, and `pre-delete`.',
      'Common uses include database migration Jobs, validation, backups, and cleanup. Define hook weights and deletion policies deliberately; hook resources are not managed exactly like ordinary release resources.',
    ],
    code: [
      {
        title: 'Hook annotations on a pre-upgrade Job',
        language: 'yaml',
        code: `metadata:
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded`,
      },
    ],
    tags: ['helm', 'hooks', 'migrations'],
  },
  {
    id: 'itv-myhelm-13',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage secrets in Helm charts?',
    probing:
      'Whether you keep secrets out of values, Git and release data, and use an external secret manager.',
    answer: [
      'I never store plaintext secrets in `values.yaml`, in Git, inside a packaged chart, or in `--set` command history. Helm stores release data inside the cluster, so just calling a value "secret" in a template doesn\'t actually protect it.',
      "My preferred approach is External Secrets Operator or the Secrets Store CSI Driver, backed by Vault, Key Vault, or a cloud secret manager. Workloads authenticate using their own identity, and Kubernetes only ever sees a mounted value or a synced Secret when it's actually needed.",
      "If encrypted values in Git are acceptable for a project, I use SOPS or helm-secrets, with the encryption keys kept outside Git entirely. I restrict RBAC access to Secrets and Helm's release data, make sure CI logs never print rendered values, test that rotation actually works, and confirm that a namespace or service account without permission genuinely can't read the secret.",
      'Do not commit plaintext secrets to `values.yaml`. Prefer a dedicated secret-management workflow such as:',
      '- External Secrets Operator\n- Secrets Store CSI Driver\n- HashiCorp Vault\n- Azure Key Vault or AWS Secrets Manager\n- Sealed Secrets\n- SOPS with an approved Helm integration',
      'Remember that rendered manifests and release data can expose values. Restrict cluster access, CI logs, artifacts, and Helm release information.',
    ],
    tags: ['helm', 'secrets', 'security'],
  },
  {
    id: 'itv-myhelm-14',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you sign and verify Helm charts?',
    probing:
      'Whether you know provenance files and GPG for classic repos, Cosign for OCI, and that signing is not safety.',
    answer: [
      'For a classic chart repository, I package and sign the chart with a protected OpenPGP key, using `helm package --sign --key <name> --keyring <ring>`. I publish both the `.tgz` and its `.prov` file — a record of where the chart came from and how it was built — and verify it with `helm verify`.',
      "Key identity, expiry, rotation, and access are all managed centrally. CI gets short-lived access to sign, rather than a developer's own exported private key.",
      "For OCI registries, I prefer signing the chart's fixed digest with a supply-chain tool like Cosign, and enforcing that signature in CI or through admission policy. I also keep track of the source commit, the build workflow's identity, an SBOM and provenance record where relevant, and the registry's audit logs.",
      "Signing proves who — or which workflow — produced an unmodified artifact. It doesn't prove the chart is actually safe. Linting, template and schema validation, security and policy checks, review, and a controlled promotion process are all still needed on top of signing.",
      'Helm can generate a provenance file — a record of where a chart came from and how it was built — and verify charts using GPG signatures.',
      "For charts published to OCI registries, signing is often handled instead with a supply-chain tool such as Sigstore Cosign, depending on the organization's delivery standard.",
    ],
    followUps: [
      'How would you enforce that only signed charts can be deployed to production?',
      'Where do you keep the signing key, and how is it rotated?',
    ],
    code: [
      {
        title: 'Sign and verify a packaged chart',
        language: 'bash',
        code: `helm package ./mychart --sign --key <key-id> --keyring <keyring-path>
helm verify mychart-1.0.0.tgz`,
      },
    ],
    tags: ['helm', 'signing', 'supply chain'],
  },
  {
    id: 'itv-myhelm-15',
    level: 'basic',
    kind: 'open',
    prompt:
      'What is email signing, what is Helm chart signing, and which tools do you use to sign Helm charts?',
    probing:
      'Whether you understand digital signatures in general and can name GPG and the helm package --sign / helm verify flow.',
    answer: [
      "**Email Signing:** Email signing is the process of digitally signing an email message to verify the sender's identity and ensure the integrity of the message content. It uses cryptographic techniques to create a digital signature that is attached to the email.",
      "The recipient can then verify the signature using the sender's public key, confirming that the email has not been altered and is indeed from the claimed sender. Common standards for email signing include **S/MIME** (Secure/Multipurpose Internet Mail Extensions) and **PGP** (Pretty Good Privacy).",
      '**Helm Chart Signing:** Helm chart signing is the process of digitally signing Helm charts to ensure their authenticity and integrity. By signing a Helm chart, the chart maintainer provides a way for users to verify that the chart has not been tampered with and is from a trusted source.',
      'Helm uses **GPG** (GNU Privacy Guard) for signing charts. When a chart is signed, a signature file is created alongside the chart package.',
      'Users can then verify the signature using the public key of the chart maintainer before installing the chart.',
      '**Tools for Signing Helm Charts:**',
      "1. **GPG (GNU Privacy Guard):** GPG is the primary tool used for signing Helm charts. It allows you to create a key pair (public and private keys) and use the private key to sign the chart. The public key can be shared with users who want to verify the chart's signature.",
      'To sign a Helm chart, you can use the following command:',
      'To verify a signed Helm chart, you can use:',
      'In summary, email signing and Helm chart signing both serve to verify authenticity and integrity, but they apply to different contexts — email communication and software package distribution, respectively. GPG is the tool commonly used for signing Helm charts.',
    ],
    code: [
      {
        title: 'Sign a chart while packaging',
        language: 'bash',
        code: `helm package <chart-path> --sign --key <key-id> --keyring <path-to-keyring>`,
      },
      {
        title: 'Verify a signed chart',
        language: 'bash',
        code: `helm verify <chart-package>`,
      },
    ],
    tags: ['helm', 'signing', 'gpg'],
  },
  {
    id: 'itv-myhelm-16',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you roll back a Helm release?',
    probing:
      'Whether you check why it failed and whether rollback is safe before running helm rollback, and verify afterwards.',
    answer: [
      'First I check why the release failed, and whether rolling back is even safe given any database or schema changes that happened since.',
      "After rolling back, I check the Deployment status, the pods, Service endpoints, run smoke tests, and watch error rate and latency, along with anything that depends on the data. `helm upgrade --atomic --wait` can automatically undo a failed upgrade, but it can't undo an incompatible database migration or some other external side effect — that has to be handled separately.",
      "I keep the failed revision's logs and rendered manifests around for the post-mortem, fix the chart, test the fix in a lower environment, and then ship a new version — rather than repeatedly retrying the same broken release in production.",
    ],
    followUps: [
      'What does helm rollback not undo?',
      'When would you fix forward instead of rolling back?',
    ],
    code: [
      {
        title: 'Inspect the release and roll back to a revision',
        language: 'bash',
        code: `helm status orders -n orders
helm history orders -n orders
kubectl get events -n orders --sort-by=.metadata.creationTimestamp
helm rollback orders 7 -n orders --wait --timeout 5m`,
      },
    ],
    tags: ['helm', 'rollback', 'incidents'],
  },
  {
    id: 'itv-myhelm-17',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does Helm fit into a CI/CD pipeline and a GitOps model?',
    probing:
      'Whether you can compare push-based helm upgrade from CI with pull-based reconciliation by Argo CD or Flux.',
    answer: [
      'A typical CI pipeline:',
      "1. Lints the chart.\n2. Validates values and renders templates.\n3. Scans images and generated manifests.\n4. Packages and publishes a fixed chart version that won't change afterward.\n5. Promotes the version after approval.",
      'In a push model, a pipeline runs Helm against the cluster directly. In a pull-based GitOps model, Flux or Argo CD watches Git or OCI sources instead, and continuously reconciles the cluster to match the declared release.',
      'GitOps improves drift detection and avoids giving a central CI system broad cluster credentials.',
      'Helm commonly participates in EKS/AKS delivery with Terraform for infrastructure, Jenkins or another CI system for builds, Argo CD/Flux for deployment, and Prometheus/Grafana/AppDynamics for observability.',
    ],
    followUps: [
      'What changes when Argo CD renders the chart instead of your pipeline?',
      'How do you promote the same chart version between environments in GitOps?',
    ],
    tags: ['helm', 'ci/cd', 'gitops'],
  },
  {
    id: 'itv-myhelm-18',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Helm chart deployment failures?',
    probing:
      'Whether you debug from rendered manifests, release state and Kubernetes events rather than retrying blindly.',
    answer: [
      'Run `helm status` and `helm get manifest` → validate the YAML → check Kubernetes events and logs → roll back with `helm rollback` if needed.',
      '**Detailed interview approach:** I start with `helm lint`, `helm template --debug`, and a server-side dry run, to catch template, values, and API-schema errors before anything actually deploys.',
      'For a release that already failed, I use `helm status <release>`, `helm get values`, `helm get manifest`, and Kubernetes events and logs to pin down the exact cause — a bad hook, an admission policy rejection, an attempt to change an immutable field, a missing CRD, a bad image, a scheduling problem, or a failed readiness check.',
      'I compare the rendered manifest and values against the last good revision. Then I fix the chart or the environment dependency in Git and run a controlled upgrade. If production is affected, I use `helm rollback <release> <revision>` and check the pods and application metrics afterward.',
      'Tests, schema validation, pinned chart versions, and time-limited atomic upgrades are what prevent this from happening again. Useful checks:',
      "Common causes of failure: invalid rendered YAML, missing values, an attempt to change a field that can't be changed after creation, a failed hook, a failed readiness probe, insufficient resources, an image-pull error, an RBAC restriction, or a dependency-version conflict.",
    ],
    followUps: [
      'A release is stuck in pending-upgrade. What do you do?',
      'How do you compare the failed revision with the last good one?',
    ],
    code: [
      {
        title: 'Helm and Kubernetes troubleshooting checks',
        language: 'bash',
        code: `helm lint ./mychart
helm template my-release ./mychart --debug
helm status my-release
helm history my-release
helm get values my-release --all
helm get manifest my-release
kubectl get events --sort-by=.metadata.creationTimestamp
kubectl describe pod <pod>
kubectl logs <pod> --previous`,
      },
    ],
    tags: ['helm', 'troubleshooting'],
  },
]
