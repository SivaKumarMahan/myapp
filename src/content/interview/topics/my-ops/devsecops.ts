import type { InterviewQuestion } from '../../../types'

/** DevSecOps: scanning, supply chain, secrets, identity, compliance and container security. */
export const myOpsDevSecOpsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myops-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What does a secure CI and GitOps delivery flow look like?',
    probing:
      'Whether you can place scans, SBOM, signing and GitOps reconciliation in the right order and know scanners are not proof of security.',
    answer: [
      '**DevSecOps** builds security checks and evidence into every stage of delivery, instead of running one big security scan at the end.',
      '**Secure CI and GitOps delivery flow**',
      "- **OWASP Dependency-Check**, or a similar tool, flags third-party dependencies with known vulnerabilities.\n- **SonarQube** checks maintainability, bugs, and configured security rules. Its quality gate is one useful signal, not proof the code is secure.\n- **Trivy**, or a similar scanner, checks filesystems, dependencies, IaC, and container images depending on the mode you run it in.\n- CI only publishes an image once it has passed the required checks, and once published that image digest never changes. Any exception needs an owner, approval, a time limit, and tracking.\n- CI updates the reviewed deployment repository, and **Argo CD** or **Flux** pulls the desired state into Kubernetes from there. CI itself doesn't need broad cluster credentials in this setup.\n- **Prometheus**, **Grafana**, and centralized logs and traces confirm the release is healthy, and alert routing closes the feedback loop.",
      "Pin your pipeline's dependencies, protect credentials with short-lived identities, generate and keep an SBOM along with proof of how each artifact was built, sign artifacts, enforce admission policy, separate duties between people, and regularly test rollback and incident response.",
      "Scanners reduce risk, but they don't replace threat modeling, secure design, patching, runtime hardening, or a human review.",
    ],
    code: [
      {
        title: 'Secure CI and GitOps flow',
        language: 'text',
        code: `pull request -> tests and quality checks -> dependency/SAST/secret/IaC scans
-> image build -> container scan, SBOM, signing -> registry (image never changes once pushed)
-> reviewed GitOps manifest update -> Argo CD/Flux reconciliation (making the cluster match Git)
-> Kubernetes admission/runtime controls -> observability and response`,
      },
    ],
    tags: ['devsecops', 'gitops', 'supply chain'],
  },
  {
    id: 'itv-myops-23',
    level: 'basic',
    kind: 'open',
    prompt: 'What are your preferred tools for SAST and DAST?',
    probing:
      'Whether you know the difference between static and dynamic testing and where each runs in the pipeline.',
    answer: [
      'My preferred tools, by type of scan:',
      "- **SAST scans source code and dependencies without running the app:** SonarQube, Semgrep, Checkmarx, Snyk Code. For dependency scanning: OWASP Dependency-Check, Snyk, Dependabot. For IaC: tfsec, Checkov, Trivy. For secrets: gitleaks, trufflehog.\n- **DAST scans the app while it's running:** OWASP ZAP, Burp Suite, Nikto.\n- **Containers:** Trivy or Grype for image scanning. Run SAST early in CI, and run DAST against a deployed staging environment.",
      '**Common DevSecOps scanners**',
      '- **TFLint** checks Terraform style and provider rules, and catches common IaC mistakes.\n- **Checkov** checks IaC against security and compliance policies.\n- **SonarQube** does static code analysis for bugs, vulnerabilities, and maintainability issues.\n- **Trivy** scans container images, filesystems, SBOMs, and supported IaC for vulnerabilities and misconfiguration.\n- **OWASP Dependency-Check** flags third-party libraries with known vulnerabilities.\n- **Gitleaks** detects committed secrets. Run it pre-commit and in CI, but remember: a caught secret still needs to be revoked and rotated, not just deleted.\n- **Snyk** covers code, dependency, container, and IaC vulnerability monitoring.',
      "Pin your scanner versions and policy baselines, scan both pull requests and release artifacts, triage findings by how exploitable and how business-critical they are, and give every exception an owner and an expiry date. A passing scan is one signal — it doesn't prove a release is secure.",
    ],
    tags: ['devsecops', 'sast', 'dast', 'scanners'],
  },
  {
    id: 'itv-myops-24',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure pipelines against supply chain attacks?',
    probing:
      'Whether you pin and verify dependencies, prove provenance with SBOMs and signatures, and use short-lived CI identity.',
    answer: [
      'I protect the supply chain at every step:',
      '- **Pin and verify dependencies:** use lockfiles, pin by checksum/hash, and pin GitHub Actions to a commit SHA instead of a mutable tag.\n- **Scan dependencies and images in CI** (Snyk/Trivy) to catch vulnerable or malicious packages.\n- **Prove where artifacts came from, and sign them:** follow the SLSA framework, sign artifacts and images with **Sigstore/cosign**, generate an **SBOM** (Syft), and verify signatures before deploy.\n- **Give CI only the access it needs:** short-lived OIDC tokens instead of long-lived secrets, scoped runner permissions, and isolated ephemeral runners.\n- **Protect the pipeline itself:** branch protection, required reviews, secret scanning, trusted internal registries/proxies, and audit logging.',
    ],
    followUps: [
      'Why pin GitHub Actions to a commit SHA rather than a tag?',
      'How would you verify an image signature before deployment?',
    ],
    tags: ['devsecops', 'supply chain', 'sbom', 'cosign'],
  },
  {
    id: 'itv-myops-25',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce pipeline security from Git to deployment?',
    probing:
      'Whether you can name concrete controls for source, build, artifact, deploy and runtime.',
    answer: [
      'I put controls at each stage:',
      '- **Source:** branch protection, signed commits, required PR reviews, secret scanning, pre-commit hooks.\n- **Build/CI:** SAST, SCA, and secret-scan gates that fail the build; ephemeral runners that only have the access they need; verified dependencies.\n- **Artifact:** scan and **sign** images (cosign), generate an SBOM, push to a private registry, and only allow signed images to deploy through admission control (Kyverno/OPA Gatekeeper).\n- **Deploy:** OIDC keyless auth, approvals for production environments, policy as code, and full audit trails.\n- **Runtime:** Falco, network policies, and continuous scanning.',
    ],
    followUps: [
      'Which of these controls would you implement first in a new organization?',
      'How do you enforce that only signed images deploy?',
    ],
    tags: ['devsecops', 'pipeline security'],
  },
  {
    id: 'itv-myops-26',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you store secrets in CI/CD securely?',
    probing:
      'Whether you use platform secret stores or vaults, prefer OIDC federation and follow secret hygiene.',
    answer: [
      'How I handle CI/CD secrets:',
      "- **Never put secrets in code or repos.** Use the platform's secret store (GitHub Actions Secrets/Environments, GitLab CI masked and protected variables, Jenkins Credentials).\n- **Prefer keyless auth:** use **OIDC federation** to assume cloud IAM roles, so there are no long-lived cloud keys at all.\n- **External vaults:** HashiCorp Vault, AWS Secrets Manager, or SSM Parameter Store, injected at runtime with short lifetimes.\n- **Hygiene:** give secrets only the access they need, mask and rotate them, scope them to specific environments, restrict them on PRs from forks, and scan for leaked secrets.",
    ],
    tags: ['devsecops', 'secrets', 'oidc'],
  },
  {
    id: 'itv-myops-27',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you implement code scanning and infrastructure scanning in a DevSecOps pipeline?',
    probing:
      'Whether you gate PRs on code, dependency, secret and IaC scans and keep scanning after deployment.',
    answer: [
      'I scan both code and infrastructure:',
      '- **Code:** SAST (SonarQube/Semgrep), dependency scanning (Snyk/Dependabot), and secret scanning (gitleaks) as CI gates on every PR.\n- **Infrastructure:** IaC scanning (Checkov/tfsec/Trivy) on Terraform/Helm/Kubernetes manifests, container image scanning (Trivy), and CIS benchmark checks (kube-bench).\n- **Gate and report:** fail builds on high/critical findings, surface results in PRs, and track them over time. Add admission control and runtime scanning (Falco) so security keeps running after deploy, not just once at the gate — "shift left" plus runtime.',
    ],
    tags: ['devsecops', 'sast', 'iac scanning'],
  },
  {
    id: 'itv-myops-28',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement runtime security beyond image vulnerability scanning?',
    probing:
      'Whether you know what image scanning misses and can combine hardening, runtime detection and response.',
    answer: [
      "Image scanning only checks things before deployment. It can't catch stolen credentials, unexpected processes, lateral movement, or a risky runtime setup once the container is actually running.",
      'So I combine signed, approved images and admission policy with hardening: non-root users, read-only root filesystems, dropped Linux capabilities, seccomp/AppArmor/SELinux, no privileged mode or host Docker socket, resource limits, namespace isolation, and default-deny network rules.',
      'At runtime, I rely on Falco, eBPF-based tooling, cloud workload protection, Kubernetes audit logs, and container monitoring to catch suspicious behavior — things like a shell popping up in a service that should never have one, writes to system paths, crypto-mining, privilege escalation, unusual outbound traffic, or access to service-account tokens.',
      'Every detection rule has an owner, context, a tested severity, and a defined response. Noisy generic alerts get tuned, not ignored.',
      'When an alert looks real, I isolate the traffic or workload first, while preserving audit, process, network, and image evidence. Then I revoke any exposed identities, check for lateral movement, and rebuild the workload or node from trusted artifacts rather than trying to clean it in place.',
      'Afterward I confirm the service has recovered and the attack path is now blocked, then improve policy, patching, key rotation, and detection coverage based on what I learned.',
    ],
    followUps: [
      'Which Falco rule would you write first?',
      'How do you contain a compromised pod without losing evidence?',
    ],
    tags: ['devsecops', 'runtime security', 'falco'],
  },
  {
    id: 'itv-myops-29',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you secure secrets for more than 100 microservices without exposing credentials?',
    probing:
      'Whether you can design per-workload identity, scoped policies, runtime delivery and rotation at scale.',
    answer: [
      'I centralize secrets in Vault, a cloud secret manager, or an approved platform, and give each workload its own short-lived identity to authenticate with. Kubernetes workload identity and service accounts, cloud IAM roles, or SPIFFE-style identities all remove the need for shared static credentials.',
      "Policies map one service, in one environment, to only the secret paths and operations it actually needs. Production identities can't be used from a developer laptop or a CI branch.",
      'Applications fetch secrets at runtime, or through an external-secrets/CSI integration that delivers them in memory or to a controlled file. Secret values never end up in Git, images, Terraform outputs, command arguments, tickets, or normal logs.',
      'Rotation works with an overlap: issue the new secret, update the consumers, verify, revoke the old one, and audit for failures. Dynamic database credentials with short lifetimes make rotation much simpler.',
      'At this scale I also need clear ownership, naming, metadata, expiry, rotation targets, access reviews, audit alerts, a break-glass procedure, and dashboards that flag stale or unused secrets. If something leaks, I revoke it first, check the audit logs to see how it was used, rotate anything downstream that trusted it, rebuild affected artifacts, and then clean up the leaked copies.',
    ],
    followUps: [
      'How do dynamic database credentials simplify rotation?',
      'What is your break-glass procedure for the secret store?',
    ],
    tags: ['secrets', 'vault', 'workload identity'],
  },
  {
    id: 'itv-myops-30',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you maintain cybersecurity practices across a DevOps environment?',
    probing:
      'Whether you apply defense in depth across source, CI, artifacts, infrastructure, runtime and response.',
    answer: [
      'I use defense in depth: source, CI, artifacts, infrastructure, workloads, and operations each get their own layer of controls.',
      "Source repositories get SSO/MFA, branch protection, signed or reviewed changes, secret scanning, and access limited to only what's needed.",
      'CI runs on isolated, short-lived runners with short-lived identities, pinned actions and plugins, SAST/SCA/IaC/container scans, SBOMs, signed artifacts, and protected deployment environments. Policies block critical violations, with a documented path for approved exceptions.',
      'Infrastructure is private by default, encrypted, built from hardened images, patched, and reviewed for IAM issues, with backups, centralized audit logs, and drift detection on the IaC. Runtime controls limit privilege and network access and feed into real, actionable alerts.',
      'Incident response has clear ownership: preserve evidence, revoke credentials, contain the issue, recover from trusted artifacts, communicate with stakeholders, and improve afterward.',
      "I track metrics like patch and secret age, time to fix critical findings, policy bypasses, privileged access, restore tests, detection coverage, and failed changes tied to security issues. Security lives inside the normal delivery path — it's not a final manual checklist at the end.",
    ],
    followUps: [
      'Which security metrics would you report to leadership?',
      'How do you handle an exception to a blocking policy?',
    ],
    tags: ['devsecops', 'security', 'defense in depth'],
  },
  {
    id: 'itv-myops-31',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A secret key was accidentally committed to Git. What actions do you take?',
    probing:
      'Whether you revoke first, check for use, rotate, and only then clean history and add prevention.',
    answer: [
      "I treat the key as compromised the moment it's committed, even if the commit gets deleted quickly. First I revoke or disable it, check the provider's and repo's audit logs to see if it was used, issue a replacement with only the access it needs and a real expiry, update consumers through the secret manager, and confirm the service still works.",
      'If that key could have unlocked other credentials, I rotate those too.',
      "Next I remove the value from the current code, and if policy requires it, coordinate a history rewrite with `git filter-repo`, protect against force-pushes, tell people to re-clone, and clean up forks, caches, CI artifacts, logs, and any package or image layers that captured it. Cleaning up history reduces exposure, but it doesn't replace revoking the key — that has to happen either way.",
      'I write down the timeline, scope, evidence of access, and how it was resolved, notify security and the owners, and add controls to prevent a repeat: pre-commit and server-side secret scanning, push protection, short-lived workload identity, restricted CI logs and artifacts, and developer training.',
      'Finally, I test that the old key no longer works and that the new identity only has the access it needs.',
    ],
    tags: ['secrets', 'git', 'incident'],
  },
  {
    id: 'itv-myops-32',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design IAM for CI/CD agents so each one has only the access it needs?',
    probing:
      'Whether you give each pipeline its own least-privilege identity and debug access errors from audit logs.',
    answer: [
      'Give each pipeline its own service account with the smallest set of roles it needs, rotate keys, use workload identity (GCP/Azure managed identities), and never share accounts across pipelines. Mini-case: each Jenkins job used a dedicated service account scoped to just its own resource group, which blocked privilege escalation.',
      '**Detailed interview approach:** I start by pinning down the exact principal, resource, action, scope, and denied condition from the error and the cloud audit logs. I check the effective IAM/RBAC picture, including inherited roles, deny policies, conditional bindings, the tenant/project/subscription, and token audience and expiry.',
      'I reproduce a harmless call with the same identity, then grant a narrow predefined or custom role at the smallest scope that works — never owner or admin just to unblock the pipeline. Workload identity or managed identity replaces static service-account keys.',
      'If a key leaked, I disable or revoke it right away, check what it was used for and what it touched, rotate related secrets, and rebuild the workload identity path. Regular access reviews, expiry, policy tests, and audit alerts keep roles from sprawling over time.',
    ],
    followUps: [
      'How do you find the minimal role a pipeline needs?',
      'What replaces static service-account keys?',
    ],
    tags: ['iam', 'ci/cd', 'least privilege'],
  },
  {
    id: 'itv-myops-33',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement fine-grained service-to-service authentication in microservices?',
    probing:
      'Whether you can issue short-lived workload identities with mTLS and enforce service-to-service authorization.',
    answer: [
      'Use mTLS through a service mesh (Istio/Linkerd) or SPIFFE/SPIRE to issue short-lived identities, and enforce policy and RBAC at the sidecar/proxy layer.',
      'Mini-case: introducing SPIRE gave workloads automatic short-lived certificates. Even if a pod was compromised, its certs expired quickly, which limited how far an attacker could move.',
      '**Detailed interview approach:** I only bring in a service mesh for a concrete need — workload identity, mTLS, traffic policy, or better monitoring data — not just to add proxies for their own sake. I inventory the protocols and ports in use, install and monitor the control plane, onboard one non-critical namespace first, and check the resource overhead of the sidecars.',
      "Identities come from service accounts and short-lived certificates. I only move mTLS from permissive to strict mode after I've observed all the real callers. The authorization policy allows exact service-to-service paths and denies everything else by default.",
      'I test certificate rotation, retries and timeouts, what happens if the control plane fails, and any way traffic could bypass the proxy — then roll it out gradually. Dashboards and tracing confirm latency and error rates stay healthy, and a clear upgrade procedure keeps the mesh supportable long-term.',
    ],
    followUps: [
      'How does SPIRE attest a workload?',
      'How do you move from permissive to strict mTLS safely?',
    ],
    tags: ['mtls', 'spiffe', 'service mesh'],
  },
  {
    id: 'itv-myops-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure CI/CD runner/agent environments?',
    probing:
      'Whether you use ephemeral, isolated agents with scoped credentials and handle leaked secrets in logs properly.',
    answer: [
      'Use ephemeral, containerized agents that run one job and then get destroyed. Limit what the agent can do, sandbox builds, run static and dynamic scans before publishing artifacts, and put sensitive pipelines on their own locked-down agents.',
      'Mini-case: switching to Kubernetes-based ephemeral agents removed the risk of persistent credential theft — each job only ever had the minimal IAM role it needed for that run.',
      '**Detailed interview approach:** I use SSO/MFA, role-based authorization, CSRF protection, TLS, a private controller, patched plugins and core, and I never run builds directly on the controller.',
      'Credentials live in Jenkins Credentials or an external vault, scoped to the smallest folder or job that needs them. Pipelines use `withCredentials`, avoid shell tracing, and never put secrets into command lines or artifacts.',
      "Agents are ephemeral, isolated, run as non-root where possible, and get a short-lived cloud identity. If a secret shows up in logs, masking alone isn't enough — I stop the exposure, revoke and rotate the secret, restrict or delete the retained logs where policy allows, audit how it was used, and fix the step that printed it.",
      'Configuration, plugins, and restore procedures are backed up and tested regularly.',
    ],
    tags: ['ci/cd', 'runners', 'jenkins', 'security'],
  },
  {
    id: 'itv-myops-35',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you rotate API keys securely in CI/CD?',
    probing: 'Whether you rotate with an overlap and treat masking as a backup control.',
    answer: [
      "Store keys in Secret Manager or Key Vault, rotate them through automation, update the pipeline's secrets, and invalidate the old keys.",
      '**Detailed interview approach:** Secrets belong in Vault, Key Vault, Secret Manager, or the CI credential store — never in Git, YAML, images, command arguments, or artifacts. Jobs get a short-lived identity and fetch only the secret they need for that stage. Masking is a backup control, since an encoded or transformed value can still leak.',
      "Rotation works with an overlap: issue the new value, update consumers, verify it works, revoke the old value, and audit for failures. If a scan finds a committed secret, I revoke it right away, check how it was used, remove it from active history where appropriate, and rotate anything downstream that trusted it — just deleting the line isn't enough.",
      'Pre-commit and server-side scans, protected logs, minimal access, expiry, and rotation tests all help prevent it from happening again.',
    ],
    tags: ['secrets', 'rotation', 'ci/cd'],
  },
  {
    id: 'itv-myops-36',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you ensure CI/CD pipelines are auditable for compliance?',
    probing:
      'Whether every run leaves traceable evidence of who, what, which artifact and which approval.',
    answer: [
      'Store pipeline definitions in Git, enable logging for every job, require approvals for production, and retain build artifacts and logs.',
      '**Detailed interview approach:** Pipeline definitions, infrastructure, policies, and approvals are all versioned and protected in Git.',
      'Every run records who triggered it, the commit, the artifact digest (which never changes once created), test and security results, the plan, who approved it, the target, timestamps, the deployment result, and any rollback. Cloud, cluster, registry, and secret-manager audit logs give independent confirmation of all this.',
      'Identities are named or tied to a workload rather than shared, with separation of duties and minimal access. Logs and artifacts get access control, integrity protection, retention rules, and time synchronization, and secrets are redacted from them.',
      'I periodically pick a release and trace it end-to-end, from the original ticket through to production and back, then fix any missing evidence before an external audit finds the gap.',
      '**From a similar question (ensuring auditability in DevOps)**',
      '- Store IaC in Git for versioning.\n- Enable Cloud Audit Logs (GCP/Azure).\n- Use Jenkins pipeline logs.\n- Add approval stages before production.',
    ],
    tags: ['compliance', 'audit', 'ci/cd'],
  },
  {
    id: 'itv-myops-37',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle secret rotation in the cloud (GCP/Azure)?',
    probing:
      'Whether you use a cloud secret manager with automatic rotation and fetch secrets dynamically.',
    answer: [
      'Use GCP Secret Manager or Azure Key Vault, turn on automatic key rotation, and have CI/CD pipelines fetch secrets dynamically instead of hardcoding them.',
      '**Detailed interview approach:** Secrets belong in Vault, Key Vault, Secret Manager, or the CI credential store — never in Git, YAML, images, command arguments, or artifacts. Jobs get a short-lived identity and fetch only the secret they need for that stage. Masking is a backup control, since an encoded or transformed value can still leak.',
      "Rotation works with an overlap: issue the new value, update consumers, verify it works, revoke the old value, and audit for failures. If a scan finds a committed secret, I revoke it right away, check how it was used, remove it from active history where appropriate, and rotate anything downstream that trusted it — just deleting the line isn't enough.",
      'Pre-commit and server-side scans, protected logs, minimal access, expiry, and rotation tests all help prevent it from happening again.',
    ],
    tags: ['secrets', 'rotation', 'key vault'],
  },
  {
    id: 'itv-myops-38',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you ensure compliance and governance in DevOps pipelines?',
    probing:
      'Whether you turn requirements into tested policy-as-code at several layers with owned, expiring exceptions.',
    answer: [
      '- Enforce policy as code with tools like OPA/Conftest.\n- Restrict which Terraform modules are allowed, for compliance.\n- Enable audit logging in GCP/Azure.\n- Add mandatory approval gates in Jenkins/Azure DevOps.',
      '**Detailed interview approach:** I turn requirements into versioned, testable controls at several layers: source and branch rules, CI scanners, Terraform plan policy, Kubernetes admission policy, and cloud-native organization policy.',
      'Typical rules require encryption, approved regions and images, non-root pods, resource limits, labels and tags, no public exposure, and identities with only the access they need.',
      'Each rule has unit tests with allowed and denied examples, and gives a clear reason and fix when it fails. Hard violations block the pipeline, while approved exceptions are scoped, owned, and expire automatically.',
      'Runtime and audit monitoring catch changes that happen outside CI. I track exceptions, false positives, and time to fix, and periodically check that each control actually maps to a real reduction in risk.',
    ],
    followUps: [
      'How do you unit-test an OPA policy?',
      'How do you stop exceptions becoming permanent?',
    ],
    tags: ['compliance', 'policy as code', 'opa'],
  },
  {
    id: 'itv-myops-39',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you ensure security in DevOps pipelines?',
    probing:
      'Whether you can name the basic pipeline security controls and protect Terraform code and credentials.',
    answer: [
      '- Scan code with SonarQube.\n- Scan images with Trivy or Anchore.\n- Give IAM roles in GCP/Azure only the access they need.\n- Store secrets in Secret Manager or Key Vault.\n- Enable audit logging.',
      '**Detailed interview approach:** Terraform code is protected by branch rules, code owners, signed or identified commits where required, and review from platform or security owners. CI pins Terraform, providers, modules, and third-party actions, then runs format, validate, lint, secret, IaC security, and policy checks before producing an access-controlled plan.',
      'Backend and cloud credentials are never stored in Git — jobs use short-lived workload identity instead. Module sources and checksums are trusted, dependency updates go through review, and applying to production is restricted to protected environments.',
      "If a secret gets committed, I revoke and rotate it immediately and audit how it was used — cleaning up history alone doesn't fix it. Audit logs tie together the commit, plan, approval, identity, and apply step.",
    ],
    tags: ['devsecops', 'pipeline security', 'terraform'],
  },
  {
    id: 'itv-myops-40',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you secure secrets in pipelines?',
    probing: 'Whether you know secrets belong in a credential store or vault and never in code.',
    answer: [
      'Use the Jenkins credentials manager, Vault, or a cloud secret manager (GCP Secret Manager, Azure Key Vault) instead of storing secrets in code.',
      '**Detailed interview approach:** Secrets belong in Vault, Key Vault, Secret Manager, or the CI credential store — never in Git, YAML, images, command arguments, or artifacts. Jobs get a short-lived identity and fetch only the secret they need for that stage. Masking is a backup control, since an encoded or transformed value can still leak.',
      "Rotation works with an overlap: issue the new value, update consumers, verify it works, revoke the old value, and audit for failures. If a scan finds a committed secret, I revoke it right away, check how it was used, remove it from active history where appropriate, and rotate anything downstream that trusted it — just deleting the line isn't enough.",
      'Pre-commit and server-side scans, protected logs, minimal access, expiry, and rotation tests all help prevent it from happening again.',
    ],
    tags: ['secrets', 'ci/cd'],
  },
  {
    id: 'itv-myops-41',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you ensure security throughout the container lifecycle from build to runtime?',
    probing:
      'Whether you can secure a container from pre-commit to runtime with scanning, admission policy, signing and detection.',
    answer: [
      'Pre-commit Dockerfile scans, then Trivy in CI rejecting critical CVEs, then ECR image scanning, then runtime network policies plus OPA Gatekeeper plus Falco, read-only root filesystems and non-root users via Pod Security Standards, and Cosign signing verified at admission.',
      '**Detailed interview approach:** This covers the whole container lifecycle. During development, developers use pre-commit hooks that scan Dockerfiles for best practices.',
      'In CI, I use Trivy for vulnerability scanning before pushing images to ECR, and automatically reject any image with a critical vulnerability.',
      'For runtime security, I use Kubernetes network policies to control pod-to-pod communication, and OPA Gatekeeper as an admission controller to enforce rules like blocking privileged containers. AWS ECR image scanning automatically notifies me when a new vulnerability turns up in a deployed image.',
      'Falco handles runtime monitoring, watching for suspicious activity and feeding it into the alerting system.',
      'Every container runs with a read-only root filesystem and a non-root user, enforced through Kubernetes Pod Security Standards. Images are signed with Cosign and the signature is checked before deployment through admission control.',
    ],
    followUps: [
      'How do you handle a new CVE found in an image already running in production?',
      'What does Pod Security Standards "restricted" enforce?',
    ],
    tags: ['containers', 'security', 'trivy', 'falco'],
  },
  {
    id: 'itv-myops-42',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage secrets and environment-specific configurations securely?',
    probing:
      'Whether you can describe a concrete secrets design with Vault, cloud secret stores, OIDC and per-environment isolation.',
    answer: [
      "HashiCorp Vault for application secrets, AWS Secrets Manager for infrastructure secrets, GitHub Actions OIDC for temporary AWS credentials, Vault's Kubernetes injection with dynamically rotating database credentials, and Kustomize overlays per environment with Vault policies keeping them isolated.",
      '**Detailed interview approach:** I use a dual approach: HashiCorp Vault for application secrets and AWS Secrets Manager for infrastructure secrets. Vault runs in each EKS cluster, authenticated through Kubernetes service accounts, and sensitive Terraform variables live in AWS Secrets Manager, accessed through the AWS provider.',
      "GitHub Actions uses OIDC to get temporary AWS credentials, so nothing is stored long-term. For application secrets, the Vault Kubernetes integration injects them at runtime, and Vault's dynamic-secrets feature automatically rotates database credentials.",
      'Environment-specific configuration is managed in Argo CD with Kustomize overlays per environment, and Vault policies keep secrets access isolated between environments.',
    ],
    followUps: [
      'How do Vault dynamic secrets rotate database credentials?',
      "How do you stop one environment reading another environment's secrets?",
    ],
    tags: ['secrets', 'vault', 'kustomize', 'oidc'],
  },
  {
    id: 'itv-myops-43',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk through a secure container delivery flow on Azure, from pull request to AKS.',
    probing:
      'Whether you can explain each independent layer of protection and why you deploy and scan the same digest.',
    answer: [
      'This is defense in depth — several independent layers of protection:',
      "- **Trivy in CI** gives fast feedback before promotion, and can fail the build based on an agreed severity level and exception policy.\n- **ACR** stores the image, which never changes after it's pushed, along with its supply-chain evidence.\n- **Azure DevOps approvals and checks** protect the production environment independently of the pipeline's YAML.\n- **Azure Key Vault and workload identity** keep application and deployment credentials out of code and images entirely.\n- **Defender for Containers** adds vulnerability assessment for the registry and running images, posture recommendations, and runtime security signals, depending on the plan and extensions enabled.\n- **AKS controls** such as RBAC scoped to only what's needed, network policy, workload identity, restrictive security contexts, and image/admission policy all limit what can go wrong at runtime.",
      "Don't just scan `latest` — deploy and scan the exact same digest. A new vulnerability found after deployment also needs ongoing reassessment, a clear owner, a fix deadline, and a tested emergency release path.",
    ],
    code: [
      {
        title: 'Azure secure container delivery flow',
        language: 'text',
        code: `GitHub protected branch and pull request
  -> GitHub Actions build, tests, SAST, dependency and secret scans
  -> build image and generate SBOM
  -> Trivy policy scan
  -> sign and publish the image digest to ACR (it won't change after this)
  -> Azure DevOps protected production environment
  -> approval, branch/policy/health checks
  -> deploy digest to AKS
  -> Defender for Containers + Azure Monitor
  -> verify, promote or roll back`,
      },
    ],
    followUps: [
      'What does Defender for Containers add beyond Trivy in CI?',
      'How would you ship an emergency fix for a critical CVE?',
    ],
    tags: ['azure', 'aks', 'devsecops', 'acr'],
  },
]
