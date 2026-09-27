import type { InterviewQuestion } from '../../../types'

/** Testing and security tooling: image scanning, supply chain, test stages and Checkov. */
export const myTestingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myjen-48',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Which security scanning tools do you run on container images at build time and registry time?',
    probing:
      'Whether you scan at build time and continuously in the registry, with policy-based gates and admission checks.',
    answer: [
      "At build time I scan source dependencies and the final image before it's published. Tools may include Trivy, Grype, Snyk, Docker Scout, or a commercial platform. Semgrep and SonarQube cover code and static findings, while Checkov and tfsec cover infrastructure definitions.",
      "I generate an SBOM (a software bill of materials — a list of what's inside the image) with Syft or the build platform. I scan the actual image, not just the Dockerfile, and fail the build based on an agreed policy covering severity, exploitability, fix availability, age, and approved exceptions.",
      'At registry time I enable continuous rescanning through a service such as ECR, ACR, Harbor, JFrog Xray, Nexus IQ, or Prisma. This catches vulnerabilities that get disclosed after an image was already built.',
      'Alerts identify the image digest — which stays fixed once the image is built — along with the deployed workloads, the owner, the exposure, the base image, and the fix deadline. Production admission checks that the image comes from an approved registry, is signed, and meets policy.',
      'I don\'t treat "zero CVEs" as the whole security program. Base images are pinned and rebuilt regularly. Secrets are scanned separately. Licenses and malware may have their own policy, and runtime controls catch behavior that scanning can\'t.',
      "Exceptions are time-bound. When a fix is needed, the patched image is rebuilt, retested, signed, promoted, and verified — I don't patch a running container in place.",
    ],
    tags: ['image scanning', 'trivy', 'registry'],
  },
  {
    id: 'itv-myjen-49',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate vulnerability scanning in CI/CD pipelines?',
    probing:
      'Whether you integrate scanners as enforced gates with SLAs and time-limited exceptions.',
    answer: [
      'Run static scans like Snyk or Trivy during the build. Fail the build if it finds critical CVEs, and automatically create a ticket to fix them.',
      'Mini-case: Trivy caught a CVE in a base image. The pipeline failed, and developers patched the image before it went out.',
      '**Detailed interview approach:** I protect the whole path from source to production. That means branch protection and code review, pinned dependencies, actions, and plugins, and isolated ephemeral build runners.',
      "Identities used by the pipeline are short-lived and least-privilege, meaning they only get the access they need for that one job. I run SAST, dependency, secret, IaC, and container scans, and generate an SBOM (a software bill of materials — a list of what's inside the build).",
      'Images and artifacts are signed with provenance, meaning you can prove where they came from and how they were built. Registries are protected, and deployment requires admission checks before anything runs.',
      'Findings get an agreed severity and SLA. Exceptions are allowed, but only for a limited time, so the gate stays enforceable instead of becoming a rubber stamp.',
      'If I suspect a compromise, I stop promotion right away. I revoke runner and signing credentials, isolate the affected artifacts, and preserve audit evidence. Then I rebuild from a trusted runner and source, and verify signatures before redeploying.',
      "Regular patching, egress restrictions, audit retention, and recovery drills cover what scanners alone can't catch.",
    ],
    tags: ['vulnerability scanning', 'ci/cd'],
  },
  {
    id: 'itv-myjen-50',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you monitor and enforce container image provenance across environments?',
    probing:
      'Whether you enforce image provenance with signatures, SBOMs and deployment gates across environments.',
    answer: [
      "Require signed images and immutable tags — once a tag is created, it can't be changed. Every image needs an SBOM, and deployments are gated on the SBOM and on vulnerability thresholds.",
      "Mini-case: A new release's SBOM showed a vulnerable dependency. The gate blocked deployment until the image was rebuilt with the dependency patched.",
      '**Detailed interview approach:** I protect the whole path from source to production. That means branch protection and code review, pinned dependencies, actions, and plugins, and isolated ephemeral build runners.',
      'Identities used by the pipeline are short-lived and least-privilege. I run SAST, dependency, secret, IaC, and container scans, and generate an SBOM.',
      'Images and artifacts are signed with provenance. Registries are protected, and deployment requires admission checks before anything runs.',
      'Findings get an agreed severity and SLA. Exceptions are allowed, but only for a limited time, so the gate stays enforceable instead of becoming a rubber stamp.',
      'If I suspect a compromise, I stop promotion right away. I revoke runner and signing credentials, isolate the affected artifacts, and preserve audit evidence. Then I rebuild from a trusted runner and source, and verify signatures before redeploying.',
      "Regular patching, egress restrictions, audit retention, and recovery drills cover what scanners alone can't catch.",
    ],
    followUps: [
      'What does an admission controller check before admitting an image?',
      'How would you block an unsigned image in production?',
    ],
    tags: ['provenance', 'sbom', 'signing'],
  },
  {
    id: 'itv-myjen-51',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you manage secrets scanning and prevention of accidental commits?',
    probing:
      'Whether you prevent secret commits with pre-commit and server-side scanning, and rotate anything found.',
    answer: [
      'Use pre-commit hooks like git-secrets, CI scanning for secrets, and push-blocking hooks in company repos. Rotate any secret that gets found, and train developers to avoid this.',
      'Mini-case: A developer accidentally committed an API key. The pre-commit hook blocked the push locally. When they tried again, the CI scan caught it and auto-rotated the leaked key.',
      '**Detailed interview approach:** Secrets belong in a secret manager such as Vault, Key Vault, or the CI credential store. They should never live in Git, YAML files, container images, command arguments, or build artifacts.',
      'Each job gets a short-lived identity and fetches only the secret it needs for that stage. Masking log output is a secondary control, not the main one — an encoded or transformed value can still leak.',
      'Rotation uses an overlap period. I issue the new value, update consumers, verify it works, then revoke the old value and check for anything that failed.',
      'If a scan finds a secret that was already committed, I revoke it immediately. I check where it was used, remove it from active history where appropriate, and rotate any downstream credentials — just deleting the line from the file is not enough.',
      'Pre-commit and server-side scans, protected logs, least privilege, expiry, and rotation tests all help prevent it happening again.',
    ],
    tags: ['secret scanning', 'pre-commit'],
  },
  {
    id: 'itv-myjen-52',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement end-to-end supply-chain security for container images?',
    probing:
      'Whether you can build end-to-end container supply-chain security with scanning, Cosign signing and registry policy.',
    answer: [
      'Sign and verify images with Cosign. Scan images during the build with Trivy or Anchore. Use reproducible builds, enforce image provenance in registries, and block unsigned or vulnerable images in the pipeline.',
      'Mini-case: In a pipeline, I added a build step that runs Trivy, then Cosign signs the image on success.',
      'The registry policy rejects any image without a valid signature — preventing a compromised build from reaching prod.',
      '**Detailed interview approach:** I protect the whole path from source to production. That means branch protection and code review, pinned dependencies, actions, and plugins, and isolated ephemeral build runners.',
      'Identities used by the pipeline are short-lived and least-privilege. I run SAST, dependency, secret, IaC, and container scans, and generate an SBOM.',
      'Images and artifacts are signed with provenance. Registries are protected, and deployment requires admission checks before anything runs.',
      'Findings get an agreed severity and SLA. Exceptions are allowed, but only for a limited time, so the gate stays enforceable instead of becoming a rubber stamp.',
      'If I suspect a compromise, I stop promotion right away. I revoke runner and signing credentials, isolate the affected artifacts, and preserve audit evidence. Then I rebuild from a trusted runner and source, and verify signatures before redeploying.',
      "Regular patching, egress restrictions, audit retention, and recovery drills cover what scanners alone can't catch.",
    ],
    followUps: [
      'What is the difference between key-based and keyless Cosign signing?',
      'How do you respond if a signing key is compromised?',
    ],
    tags: ['supply chain', 'cosign', 'containers'],
  },
  {
    id: 'itv-myjen-53',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure CI/CD pipelines from supply chain attacks?',
    probing:
      'Whether you defend pipelines with pinned dependencies, verified signatures and restricted plugins.',
    answer: [
      'Pin dependencies → Verify container/image signatures (Cosign) → Scan dependencies → Restrict external plugin usage.',
      '**Detailed interview approach:** I protect the whole path from source to production. That means branch protection and code review, pinned dependencies, actions, and plugins, and isolated ephemeral build runners.',
      'Identities used by the pipeline are short-lived and least-privilege. I run SAST, dependency, secret, IaC, and container scans, and generate an SBOM.',
      'Images and artifacts are signed with provenance. Registries are protected, and deployment requires admission checks before anything runs.',
      'Findings get an agreed severity and SLA. Exceptions are allowed, but only for a limited time, so the gate stays enforceable instead of becoming a rubber stamp.',
      'If I suspect a compromise, I stop promotion right away. I revoke runner and signing credentials, isolate the affected artifacts, and preserve audit evidence. Then I rebuild from a trusted runner and source, and verify signatures before redeploying.',
      "Regular patching, egress restrictions, audit retention, and recovery drills cover what scanners alone can't catch.",
    ],
    followUps: [
      'Why pin actions and plugins to exact versions or SHAs?',
      'How do you restrict runner egress?',
    ],
    tags: ['supply chain', 'pipelines'],
  },
  {
    id: 'itv-myjen-54',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you enforce code quality checks before merging in CI/CD?',
    probing:
      'Whether you make linting, tests and SonarQube required checks on a protected main branch.',
    answer: [
      'Add mandatory linting, unit tests, SonarQube scans in Jenkins/GitHub Actions → Fail build if checks don’t pass → Protect main branch with approval rules.',
      '**Detailed interview approach:** I protect the whole path from source to production. That means branch protection and code review, pinned dependencies, actions, and plugins, and isolated ephemeral build runners.',
      'Identities used by the pipeline are short-lived and least-privilege. I run SAST, dependency, secret, IaC, and container scans, and generate an SBOM.',
      'Images and artifacts are signed with provenance. Registries are protected, and deployment requires admission checks before anything runs.',
      'Findings get an agreed severity and SLA. Exceptions are allowed, but only for a limited time, so the gate stays enforceable instead of becoming a rubber stamp.',
      'If I suspect a compromise, I stop promotion right away. I revoke runner and signing credentials, isolate the affected artifacts, and preserve audit evidence. Then I rebuild from a trusted runner and source, and verify signatures before redeploying.',
      "Regular patching, egress restrictions, audit retention, and recovery drills cover what scanners alone can't catch.",
    ],
    tags: ['code quality', 'branch protection'],
  },
  {
    id: 'itv-myjen-55',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you enforce security scans in CI/CD?',
    probing:
      'Whether you know which scans cover code, running apps, images and IaC and how to enforce them.',
    answer: [
      'Add SAST (code scan with SonarQube) and DAST (OWASP ZAP) → Container image scans (Trivy/Anchore) → IaC scans (Checkov, tfsec).',
      '**Detailed interview approach:** I protect the whole path from source to production. That means branch protection and code review, pinned dependencies, actions, and plugins, and isolated ephemeral build runners.',
      'Identities used by the pipeline are short-lived and least-privilege. I run SAST, dependency, secret, IaC, and container scans, and generate an SBOM.',
      'Images and artifacts are signed with provenance. Registries are protected, and deployment requires admission checks before anything runs.',
      'Findings get an agreed severity and SLA. Exceptions are allowed, but only for a limited time, so the gate stays enforceable instead of becoming a rubber stamp.',
      'If I suspect a compromise, I stop promotion right away. I revoke runner and signing credentials, isolate the affected artifacts, and preserve audit evidence. Then I rebuild from a trusted runner and source, and verify signatures before redeploying.',
      "Regular patching, egress restrictions, audit retention, and recovery drills cover what scanners alone can't catch.",
    ],
    tags: ['sast', 'dast', 'iac scanning'],
  },
  {
    id: 'itv-myjen-56',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What types of testing do you include in your CI/CD pipeline, and at what stages do they run?',
    probing:
      'Whether you place each type of test at the right pipeline stage and make it a required check.',
    answer: [
      'Unit tests on every commit with coverage → Trivy image scan after build → integration tests in dev → `terraform plan` validation → e2e (Cypress) + performance (k6) in staging → post-deploy smoke tests → required PR checks + ArgoCD health gates. **Detailed interview approach:** The GitHub Actions workflow includes multiple testing stages. Unit tests run on every commit using language-specific frameworks with coverage enforcement.',
      'After building container images, I conduct security scanning with Trivy. For deployments to dev, the pipeline runs integration tests against the deployed APIs.',
      'Terraform plan validation runs before any infrastructure changes are applied. In staging, I execute end-to-end tests with Cypress and performance tests using k6.',
      'Post-deployment smoke tests verify core functionality in every environment. Each test stage is a required check in GitHub pull requests, and failures block promotion to higher environments.',
      "ArgoCD's health checks provide an additional validation layer after deployment.",
    ],
    tags: ['testing', 'stages'],
  },
  {
    id: 'itv-myjen-57',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you automate unit, integration, and end-to-end tests in your pipeline?',
    probing:
      'Whether you automate unit, integration and end-to-end tests with the right targets and reporting.',
    answer: [
      'GitHub Actions automates all layers → unit tests in build stage → integration tests against dev EKS via OIDC → Cypress e2e against staging → artifacts uploaded → ArgoCD readiness gates → failed tests auto-create issues.',
      '**Detailed interview approach:** GitHub Actions workflows automate all testing. Unit tests run in the build stage, triggered on every push, using workspace-mounted volumes for test reports and coverage data.',
      'Integration tests run after deploying to the dev EKS cluster. GitHub Actions uses OIDC-based access to invoke tests against the deployed endpoints.',
      'End-to-end tests with Cypress run in dedicated GitHub Actions runners with browser capabilities, targeting staging after deployment. Test results and artifacts get uploaded for review.',
      'ArgoCD deployments include readiness gates that verify system health before the deployment completes. Failed tests in GitHub Actions automatically create an issue for developers, with a link to the run and its logs.',
    ],
    tags: ['test automation', 'cypress'],
  },
  {
    id: 'itv-myjen-58',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you ensure integration tests work across different environments?',
    probing:
      'Whether integration tests read config from the environment and use seeded data and stubs to stay reliable.',
    answer: [
      'Tests read config from env vars/Terraform outputs → Kubernetes Jobs seed fixtures → Wiremock for external dependencies → env-specific databases via Terraform + migrations → cleanup jobs → ArgoCD keeps consistent app state.',
      '**Detailed interview approach:** I structure integration tests to read configuration from environment variables injected by GitHub Actions workflows. Each test job pulls environment-specific endpoints from Terraform outputs and EKS service discovery.',
      'Test data is managed through Kubernetes Jobs that seed test fixtures before test execution.',
      'For external dependencies, I use Wiremock containers deployed alongside the application to give consistent responses. Database tests run against environment-specific databases provisioned by Terraform, with migrations applied to keep the schema compatible.',
      'After tests complete, cleanup jobs remove test data, and ArgoCD ensures consistent application state across environments, making integration tests reliable across the pipeline.',
    ],
    followUps: [
      'How do you keep test data from leaking between runs?',
      'When would you use Wiremock instead of the real dependency?',
    ],
    tags: ['integration tests', 'environments'],
  },
  {
    id: 'itv-myjen-59',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Checkov, and where do you use it with Terraform?',
    probing:
      'Whether you know what Checkov is, what it catches and that a pass is evidence, not proof.',
    answer: [
      'Checkov statically analyzes Terraform and other IaC against security and policy checks before infrastructure is deployed. I run it locally or in pre-commit for fast feedback and in pull-request CI as an enforced gate.',
      'It can detect patterns such as public storage, unrestricted security rules, missing encryption or logging and unsafe Kubernetes settings.',
      "I combine it with `terraform fmt -check`, `validate`, a reviewed plan, provider/cloud policy, and post-deployment verification. Static scanning can't see every runtime value, external resource, or business requirement. A pass is evidence, not proof of complete security.",
      'Checkov is a static policy and security scanner for infrastructure-as-code. For Terraform, it reads the configuration (or a supported plan in JSON) and checks it against built-in or custom policies.',
      'It catches misconfigurations such as public exposure, missing encryption or logging, weak network rules, and unsafe defaults. It also supports other IaC frameworks besides Terraform.',
      "Checkov does **not** prove runtime security. It doesn't replace `terraform validate`, provider policy, cloud audit, or penetration testing — it's one layer, not the whole program.",
    ],
    code: [
      {
        title: 'Scan a Terraform directory',
        language: 'bash',
        code: `checkov --directory ./terraform --framework terraform`,
      },
    ],
    tags: ['checkov', 'terraform', 'iac scanning'],
  },
  {
    id: 'itv-myjen-60',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Checkov into a CI/CD pipeline?',
    probing:
      'Whether you run a pinned Checkov as an enforced PR gate without cloud credentials and with visible results.',
    answer: [
      "The pipeline uses a pinned Checkov version and checks out the reviewed commit. It scans the correct root modules and variable/plan context, writes a machine-readable report where required, and blocks based on the organization's agreed policy.",
      "The job has no cloud credentials when scanning the source doesn't need them. Access to the report and its artifacts is restricted, because findings can reveal how the infrastructure is built.",
      "I keep the same configuration locally and in CI, deliberately exclude generated and vendor directories, and make the result visible on the pull request. After a tool or policy upgrade, I test it against representative repositories before enforcing it, so a new rule set doesn't unexpectedly block every team.",
      'Run it locally or in a pre-commit hook for fast feedback, and again in pull-request CI before `terraform apply`. In CI:',
      '- **Pin the Checkov version**: Keeps results reproducible across runs\n- **Publish a machine-readable report (SARIF, JUnit XML)**: Makes findings visible in the PR and to other tools\n- **Fail according to an agreed policy**: Turns the scan into an enforceable gate, not just a suggestion',
      "Review each finding against the real resource path, its variables and modules, the provider's actual behavior, and the environment it targets — don't just react to the check ID.",
    ],
    code: [
      {
        title: 'Checkov step in a workflow',
        language: 'yaml',
        code: `- name: Scan Terraform with Checkov
  run: checkov --directory infrastructure --framework terraform`,
      },
      {
        title: 'Scan a directory or a single file',
        language: 'bash',
        code: `checkov --directory . --framework terraform
checkov --file main.tf --framework terraform`,
      },
    ],
    tags: ['checkov', 'ci/cd'],
  },
  {
    id: 'itv-myjen-61',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Checkov fails a Terraform pipeline. How do you investigate and fix it?',
    probing:
      'Whether you trace a finding to the real resource and fix the design rather than skipping the check.',
    answer: [
      "I capture the check ID, resource address, file and line, the evaluated attribute, and the guideline it's checking. Then I trace the full module and variable path, to tell apart a real insecure value from an unknown or dynamic value, a generated configuration, or a false positive.",
      "I read the policy and the provider's behavior, then fix the Terraform to the secure design — for example private access, encryption, diagnostic logging, or a restricted CIDR. I rerun Checkov plus Terraform validate/plan to confirm.",
      "If an exception is genuinely needed, I document the threat, the compensating control, the owner, the approval, and the expiry, against the exact check and resource. I don't use a broad `--skip-check` or suppress it repo-wide.",
      'After deployment, cloud policy/configuration evidence verifies that the intended control exists.',
    ],
    tags: ['checkov', 'troubleshooting', 'terraform'],
  },
  {
    id: 'itv-myjen-62',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do Checkov suppressions and custom checks work safely?',
    probing:
      'Whether you keep suppressions narrow and tracked and roll custom policies out in advisory mode first.',
    answer: [
      'A narrow inline suppression associates a Checkov check ID and reason with a specific Terraform block:',
      "The syntax alone doesn't make the exception acceptable. Review still checks the reason, the compensating evidence, the scope, and the expiry. Exceptions are logged in an inventory and rechecked periodically.",
      'For an organization-specific rule, I write a versioned external check, add positive and negative unit fixtures, and load it through the supported external-check mechanism. I run it in report-only mode first, measure false positives, document the fix and its owner, then turn on enforcement.',
      'Policy code gets the same review and release discipline as infrastructure modules do.',
      'An exception must record:',
      '- The specific check ID\n- The business or technical reason\n- An owner\n- A compensating control\n- Who approved it\n- An expiry date',
      "A suppression is **not** a fix — it's a tracked, time-bound decision to accept risk. Never skip an entire directory or severity just to make the pipeline green.",
      "Organization-specific rules should be versioned and unit tested like any other code. Roll them out in audit or advisory mode first, so you can see what they'd block, before switching them to enforce and failing production changes.",
    ],
    code: [
      {
        title: 'Narrow inline suppression with a reason',
        language: 'hcl',
        code: `resource "aws_s3_bucket" "audit_archive" {
  # checkov:skip=CKV_AWS_18: Central organization trail writes access evidence.
  bucket = "example-audit-archive"
}`,
      },
    ],
    followUps: [
      'How do you stop suppressions from piling up forever?',
      'How do you unit test a custom Checkov policy?',
    ],
    tags: ['checkov', 'suppressions', 'custom policies'],
  },
  {
    id: 'itv-myjen-63',
    level: 'advanced',
    kind: 'open',
    prompt: 'Should you scan Terraform source or the Terraform plan?',
    probing:
      'Whether you know the trade-off between scanning source and scanning a JSON plan, including plan sensitivity.',
    answer: [
      'Source scanning is fast. It gives file-level feedback before you need credentials or a plan, but some values stay unknown, or only appear once modules resolve. Plan scanning can evaluate more of the resolved configuration, but it needs a safely generated JSON plan, and that plan may contain sensitive values.',
      'I usually scan the source on every pull request, and add a protected plan scan for high-risk production workflows.',
      'Plan and state artifacts are encrypted, access-controlled, and never printed without care. Neither mode replaces reviewing destructive changes, securing state, enforcing runtime cloud policy, or testing the application itself.',
    ],
    followUps: [
      'Why can a Terraform plan file be sensitive?',
      'Which values can a source scan not see?',
    ],
    tags: ['checkov', 'terraform plan'],
  },
]
