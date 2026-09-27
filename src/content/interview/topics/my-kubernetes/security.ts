import type { InterviewQuestion } from '../../../types'

/** Cluster hardening, RBAC, network policy, secrets, certificates, tenancy and supply chain. */
export const myKubernetesSecurityQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myk8s-95',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure a Kubernetes cluster?',
    probing:
      'Whether you secure every layer and verify the controls actually work, rather than naming one tool.',
    answer: [
      'I secure every layer:',
      '- Identity, MFA, and RBAC with only the permissions people actually need.\n- A private or restricted API endpoint with audit logging.\n- Patched control-plane and worker-node versions.\n- Pod Security Admission, non-root containers, no privilege escalation, dropped capabilities, seccomp, and read-only filesystems.\n- Signed, scanned, digest-pinned images.\n- NetworkPolicies and controlled outbound traffic.\n- External secrets, workload identity, and encryption.\n- Quotas, tenant separation, runtime detection, central logs, and backups.',
      'Policies are versioned and tested, and any exception has an expiry date. Nodes use fixed, replaceable images where possible, and etcd data and backups stay protected. I continuously check RBAC, public exposure, deprecated versions, and certificate expiry, and I test what happens when a deployment gets denied and how the incident procedure holds up.',
      'Security is about managing threat and risk, not a checklist. No single tool "secures Kubernetes" — what matters is verifying the controls actually work and that response and restore procedures hold up under a real test.',
      '- Use RBAC for access control.\n- Enable Network Policies.\n- Regularly patch cluster.\n- Restrict container privileges (no root user).\n- Use Secrets API for sensitive data.',
      '**Detailed interview approach:** I apply defense in depth: private or restricted API access, SSO with least-privilege RBAC, separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit and runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect an exposure, I isolate the workload, preserve audit and runtime evidence, revoke tokens or credentials, check for lateral movement, and rebuild from a trusted image.',
      'I verify both the denied and the allowed paths with real service accounts, and periodically review RBAC, unused permissions, certificate and secret rotation, patch levels, backup and restore, and any policy exceptions still open.',
      'Use layered controls:',
      '- Strong identity integration and least-privilege RBAC\n- Namespaces, quotas, and tenancy boundaries\n- Pod Security Admission\n- Non-root containers and restrictive security contexts\n- Read-only root filesystems\n- Dropped Linux capabilities and seccomp profiles\n- Trusted, signed, and scanned images\n- NetworkPolicies\n- External secret stores and workload identity\n- API audit logs and runtime monitoring\n- Regular cluster and node-image upgrades',
      'A security context can define `runAsUser`, `runAsGroup`, `fsGroup`, `allowPrivilegeEscalation`, capabilities, SELinux options, seccomp, privileged mode, and read-only filesystem settings.',
    ],
    followUps: [
      'How do you roll out Pod Security Admission without breaking existing workloads?',
      'How do you verify a denied path actually stays denied?',
    ],
    tags: ['security', 'hardening'],
  },
  {
    id: 'itv-myk8s-96',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce zero-trust security in a Kubernetes cluster?',
    probing:
      'Whether you can combine default-deny networking, workload identity, mTLS and admission policy into zero trust.',
    answer: [
      'Disable default network connectivity, apply strict NetworkPolicies, enforce PodSecurityAdmission, use mTLS with a service mesh, and verify identity per request.',
      'Mini-case: We deployed Istio with strict mTLS and namespace isolation; even if an attacker gained pod access, they couldn’t reach other services without valid identity.',
      '**Detailed interview approach:** I apply defense in depth: private or restricted API access, SSO with least-privilege RBAC, separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit and runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect an exposure, I isolate the workload, preserve audit and runtime evidence, revoke tokens or credentials, check for lateral movement, and rebuild from a trusted image.',
      'I verify both the denied and the allowed paths with real service accounts, and periodically review RBAC, unused permissions, certificate and secret rotation, patch levels, backup and restore, and any policy exceptions still open.',
    ],
    followUps: [
      'What does a service mesh add that NetworkPolicies do not?',
      'How do you handle an exposed service account token?',
    ],
    tags: ['zero trust', 'mtls', 'network policy'],
  },
  {
    id: 'itv-myk8s-97',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you use Kubernetes security contexts to configure permissions and access controls?',
    probing:
      'Whether you can configure runAsUser, capabilities, read-only filesystems, seccomp and pod-level settings.',
    answer: [
      'Kubernetes **Security Contexts** allow you to define security settings for Pods and Containers. They help configure permissions and access controls to enhance the security of your applications running in a Kubernetes cluster. Here are some key aspects:',
      '**1. User and Group IDs:** Specify the user ID (UID) and group ID (GID) that a container should run as using the `runAsUser` and `runAsGroup` fields.',
      '**2. Privileged containers:** Set the `privileged` field to `true` to allow a container to run with elevated privileges.',
      '**3. Read-only root filesystem:** Enforce a read-only root filesystem for a container by setting the `readOnlyRootFilesystem` field to `true`.',
      '**4. Capabilities:** Add or drop Linux capabilities for a container using the `capabilities` field.',
      '**5. Seccomp profiles:** Specify a seccomp profile to restrict system calls that a container can make.',
      '**6. SELinux options:** Set SELinux options for a container using the `seLinuxOptions` field.',
      '**7. Pod-level security context:** Define a security context at the Pod level that applies to all containers within the Pod.',
      'By configuring security contexts, you can enforce security policies and ensure that your applications run with the appropriate permissions and access controls in a Kubernetes environment.',
    ],
    code: [
      {
        title: 'Run as a specific user and group',
        language: 'yaml',
        code: `securityContext:
  runAsUser: 1000
  runAsGroup: 3000`,
      },
      {
        title: 'Privileged container',
        language: 'yaml',
        code: `securityContext:
  privileged: true`,
      },
      {
        title: 'Read-only root filesystem',
        language: 'yaml',
        code: `securityContext:
  readOnlyRootFilesystem: true`,
      },
      {
        title: 'Add and drop capabilities',
        language: 'yaml',
        code: `securityContext:
  capabilities:
    add: ["NET_ADMIN"]
    drop: ["MKNOD"]`,
      },
      {
        title: 'Seccomp profile',
        language: 'yaml',
        code: `securityContext:
  seccompProfile:
    type: Localhost
    localhostProfile: "profiles/seccomp.json"`,
      },
      {
        title: 'SELinux options',
        language: 'yaml',
        code: `securityContext:
  seLinuxOptions:
    level: "s0:c123,c456"`,
      },
      {
        title: 'Pod-level security context',
        language: 'yaml',
        code: `apiVersion: v1
kind: Pod
metadata:
  name: mypod
spec:
  securityContext:
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: mycontainer
    image: myimage`,
      },
    ],
    tags: ['security context', 'pods'],
  },
  {
    id: 'itv-myk8s-98',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you set up RBAC so users only get read-only access to check logs?',
    probing:
      'Whether you know pods/log is a subresource and can bind a read-only role at the right scope.',
    answer: [
      'Use a `ClusterRole` scoped to reading pods and pod logs, then bind it to the user:',
      'The manifest in the code sample grants only get and list on Pods and their logs.',
    ],
    code: [
      {
        title: 'ClusterRole and binding for reading Pod logs',
        language: 'yaml',
        code: `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: log-reader
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: log-reader-binding
subjects:
- kind: User
  name: log-user
roleRef:
  kind: ClusterRole
  name: log-reader
  apiGroup: rbac.authorization.k8s.io`,
      },
    ],
    tags: ['rbac', 'logs'],
  },
  {
    id: 'itv-myk8s-99',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you enforce least privilege (only the permissions needed) in Kubernetes?',
    probing:
      'Whether you scope roles and bindings tightly, restrict cluster-admin and back RBAC with admission policy.',
    answer: [
      'Use RBAC roles → Bind only necessary permissions → Restrict cluster admin → Enable Pod Security Admission (PodSecurityPolicy was removed in Kubernetes 1.25)/OPA.',
      '**Detailed interview approach:** I apply defense in depth: private or restricted API access, SSO with least-privilege RBAC, separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit and runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect an exposure, I isolate the workload, preserve audit and runtime evidence, revoke tokens or credentials, check for lateral movement, and rebuild from a trusted image.',
      'I verify both the denied and the allowed paths with real service accounts, and periodically review RBAC, unused permissions, certificate and secret rotation, patch levels, backup and restore, and any policy exceptions still open.',
    ],
    tags: ['rbac', 'least privilege'],
  },
  {
    id: 'itv-myk8s-100',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What is the difference between RBAC and what Argo CD gives you for access control? Why do most production teams stop using raw RBAC for developer access?',
    probing:
      'Whether you have run access control for a real team and know why GitOps dashboards replace per-person RBAC.',
    answer: [
      'This question separates people who have worked in a real team from people who have only worked alone.',
      'The textbook answer: RBAC is Kubernetes-native access control — Roles, ClusterRoles, RoleBindings. Give developers read access to their namespace, DevOps engineers full access, done.',
      'That works on paper. In production with a real team it becomes painful fast.',
      'Suppose you have 20 developers across four teams, each owning two microservices, plus five DevOps engineers who need full cluster access, plus product managers and stakeholders who want visibility without touching anything.',
      'With raw RBAC you must create and manage Roles and RoleBindings for 25 people across multiple namespaces, distribute and manage their kubeconfig files, and repeat the whole dance whenever someone joins, leaves, or changes teams.',
      'Manageable for five people; painful for 25; it does not scale.',
      'The other problem is visibility. A developer who just wants to know whether their deployment went through needs `kubectl` access, which means learning `kubectl`, pod states, and deployment conditions.',
      'Most developers do not want that — they want a dashboard that says green or red.',
      "This is why, in my client's environment, we gave **Argo CD** access to the cluster, not the developers. Argo CD holds the cluster access; developers get access to the Argo CD dashboard only.",
      'They can see their deployments, which version is running, whether a sync failed and why, and trigger a manual sync if needed.',
      'All of that is controlled at the Argo CD level, not Kubernetes RBAC — no kubeconfig distribution, no RoleBinding per person, and stakeholders get read-only Argo CD access with zero Kubernetes exposure.',
      'Argo CD also gives you drift protection that raw RBAC does not. If someone with `kubectl` access manually changes a deployment, raw RBAC leaves you blind until something breaks.',
      'Argo CD immediately marks the app `OutOfSync` and can auto-heal it back to what is in Git. Git is the source of truth and nobody can override it silently.',
      'That is the production answer — not just what RBAC is, but why teams move away from managing it manually and what they use instead.',
    ],
    followUps: [
      'How do Argo CD Projects restrict what a team can deploy?',
      'Who still needs direct kubectl access, and how is it granted?',
    ],
    tags: ['rbac', 'argo cd', 'gitops'],
  },
  {
    id: 'itv-myk8s-101',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can you restrict which Pods can access other Pods in Kubernetes?',
    probing:
      'Whether you know NetworkPolicies are L3/L4 allow-lists that need a CNI which enforces them.',
    answer: [
      'Use Network Policies to control traffic flow between pods:',
      'Network policies work at L3/L4 and require a CNI that supports them (Calico, Cilium, etc.).',
    ],
    code: [
      {
        title: 'NetworkPolicy allowing only one app',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: allowed-app`,
      },
    ],
    tags: ['network policy'],
  },
  {
    id: 'itv-myk8s-102',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can you ensure only Pods with a specific label can talk to your backend service?',
    probing:
      'Whether you can select the backend Pods and allow ingress only from Pods carrying a label on a specific port.',
    answer: [
      'Use a NetworkPolicy that selects the backend pods and allows ingress only from pods with the required label:',
      'Only pods with the label `access-backend: "true"` can reach the backend pods.',
    ],
    code: [
      {
        title: 'Backend access NetworkPolicy',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-access-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          access-backend: "true"
    ports:
    - protocol: TCP
      port: 8080`,
      },
    ],
    tags: ['network policy', 'labels'],
  },
  {
    id: 'itv-myk8s-103',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage secrets in Kubernetes?',
    probing:
      'Whether you know base64 is not encryption and move to encryption at rest plus an external manager.',
    answer: [
      'Store in Kubernetes Secrets (base64 encoded) → Encrypt at rest → Integrate with Vault/Key Vault for rotation.',
      '**Detailed interview approach:** I apply defense in depth: private or restricted API access, SSO with least-privilege RBAC, separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit and runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect an exposure, I isolate the workload, preserve audit and runtime evidence, revoke tokens or credentials, check for lateral movement, and rebuild from a trusted image.',
      'I verify both the denied and the allowed paths with real service accounts, and periodically review RBAC, unused permissions, certificate and secret rotation, patch levels, backup and restore, and any policy exceptions still open.',
    ],
    tags: ['secrets'],
  },
  {
    id: 'itv-myk8s-104',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you handle authentication for AKS clusters and store secrets securely in Kubernetes?',
    probing:
      'Whether you know Entra ID integration, managed identities and the layers of Secret protection on AKS.',
    answer: [
      '**Authentication for AKS clusters:**',
      '1. **Microsoft Entra ID (formerly Azure Active Directory) Integration:** AKS can be integrated with Entra ID to manage user access to the cluster. This allows you to use Entra ID identities for authentication and role-based access control (RBAC) within the cluster.\n2. **kubeconfig file:** When you create an AKS cluster, a kubeconfig file is generated that contains the necessary credentials to access the cluster. Use the `az aks get-credentials` command to download and configure your kubeconfig file.\n3. **Service Principals and Managed Identities:** AKS can use Azure Service Principals or Managed Identities for authenticating applications running in the cluster to access Azure resources securely.',
      '**Storing secrets securely in Kubernetes:**',
      '1. **Kubernetes Secrets:** Kubernetes provides a built-in resource called Secrets to store sensitive information such as passwords, OAuth tokens, and SSH keys. Secrets are base64-encoded and can be created using YAML manifests or the `kubectl create secret` command.\n2. **Encryption at Rest:** You can enable encryption at rest for Secrets in Kubernetes by configuring the encryption providers in the API server.\n3. **External Secret Management Tools:** For enhanced security, you can use external secret management tools like HashiCorp Vault, Azure Key Vault, or AWS Secrets Manager. These tools can be integrated with Kubernetes to fetch secrets dynamically at runtime.\n4. **RBAC Policies:** Implement Role-Based Access Control (RBAC) policies to restrict access to Secrets based on user roles and permissions.\n5. **Avoid Hardcoding Secrets:** Never hardcode sensitive information in your application code or configuration files. Always use Secrets or external secret management solutions.',
      'By following these practices, you can ensure secure authentication for your AKS clusters and safely manage sensitive information within your Kubernetes environment.',
    ],
    tags: ['aks', 'authentication', 'secrets'],
  },
  {
    id: 'itv-myk8s-105',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you securely manage secrets and certificates in EKS?',
    probing:
      'Whether you use Pod Identity or IRSA, an external secret store, KMS envelope encryption and cert-manager.',
    answer: [
      'I use EKS Pod Identity or IRSA so a ServiceAccount gets short-lived AWS permissions instead of long-lived credentials. Secrets themselves live in Secrets Manager or Parameter Store, and get mounted or synced in using the Secrets Store CSI driver or External Secrets.',
      'If a Kubernetes Secret does exist, I turn on envelope encryption with KMS and keep RBAC and audit narrow — remember, base64 is not encryption.',
      'Certificates go through cert-manager with an approved issuer, such as a private CA or ACM integration, with renewal alerts and a tested reload path. I never put secrets in Helm values, Git, or environment logs.',
      "When troubleshooting, I check the ServiceAccount's annotation and association, the OIDC trust relationship, the IAM policy, CSI or operator logs, the secret's version, KMS, network endpoints and DNS, and file permissions. A rotation test confirms the application picks up the new value without an outage and that the old credentials actually get revoked.",
    ],
    followUps: [
      'What is the difference between IRSA and EKS Pod Identity?',
      'How do you prove an app picks up a rotated secret without an outage?',
    ],
    tags: ['eks', 'secrets', 'certificates'],
  },
  {
    id: 'itv-myk8s-106',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage secret rotation across CI/CD, Kubernetes, and apps?',
    probing:
      'Whether you rotate with an overlap period and treat a leaked secret as revoke-first, not delete-the-line.',
    answer: [
      'Centralize secrets in Vault/Key Vault/Secret Manager, use dynamic short-lived credentials where possible, automate rotation with scripts/events, update pipeline/runtime fetch logic to fetch latest secrets at runtime, and test rotation in staging.',
      'Mini-case: We used Azure Key Vault with rotation policy; CI fetched secrets at job runtime and apps used managed identities to request short-lived tokens, removing the need for static credentials.',
      '**Detailed interview approach:** Secrets belong in Vault, Key Vault, Secret Manager, or the CI credential store — never in Git, YAML, images, command arguments, or build artifacts. A job gets a short-lived identity and fetches only the secret it actually needs for that stage. Masking output is only a secondary control, since an encoded or transformed value can still leak.',
      "Rotation uses an overlap period: issue the new value, update the consumers, verify it works, revoke the old value, and audit for failures. If a scan finds a secret committed to the repo, I revoke it immediately, check where it was used, remove it from active history where that's appropriate, and rotate any downstream credentials too — just deleting the line isn't enough.",
      'Pre-commit and server-side scans, protected logs, least privilege, expiry, and rotation tests are what prevent this from happening again.',
    ],
    followUps: [
      'How do you rotate a database password with zero downtime?',
      'What do you do after a secret is found in Git history?',
    ],
    tags: ['secrets', 'rotation', 'ci/cd'],
  },
  {
    id: 'itv-myk8s-107',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you handle Kubernetes secret exposure in logs?',
    probing:
      'Whether you revoke and rotate an exposed secret, check for misuse and stop the step that printed it.',
    answer: [
      'Prevent kubectl describe from showing → Use kubectl get secret -o jsonpath securely → Audit RBAC → Enable encryption at rest.',
      '**Detailed interview approach:** I apply defense in depth: private or restricted API access, SSO with least-privilege RBAC, separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit and runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect an exposure, I isolate the workload, preserve audit and runtime evidence, revoke tokens or credentials, check for lateral movement, and rebuild from a trusted image.',
      'I verify both the denied and the allowed paths with real service accounts, and periodically review RBAC, unused permissions, certificate and secret rotation, patch levels, backup and restore, and any policy exceptions still open.',
    ],
    followUps: [
      'Who could have read the exposed value?',
      'How do you stop kubectl describe or CI output leaking values?',
    ],
    tags: ['secrets', 'logs', 'incidents'],
  },
  {
    id: 'itv-myk8s-108',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle certificate rotation in on-prem Kubernetes clusters?',
    probing:
      'Whether you inventory certificates, follow the kubeadm renewal procedure and rotate app TLS with an overlap.',
    answer: [
      'I start with an inventory: who owns each certificate, its issuer, purpose, expiry, trust chain, and consumers. For kubeadm clusters, I check `kubeadm certs check-expiration`, back up etcd and config, follow the version-specific documented renewal steps, update admin kubeconfigs and restart static Pods or components as needed, and then verify nodes, the API server, and controllers.',
      "Kubelet's own certificate rotation is checked separately.",
      'Application TLS goes through cert-manager with an internal ACME setup or CA, with alerts well before expiry. Rotation happens in stages: issue the new certificate with an overlap period so both are trusted, deploy or reload the consumers, verify the full TLS chain, SAN, and hostname from a real client, and only then revoke and remove the old one.',
      'I test all of this in non-production first and document the recovery steps. Blindly replacing certificate files can break quorum or API access, so I plan for maintenance windows and console access ahead of time.',
    ],
    followUps: [
      'What breaks first when the API server certificate expires?',
      'How does kubelet client certificate rotation work?',
    ],
    tags: ['certificates', 'kubeadm'],
  },
  {
    id: 'itv-myk8s-109',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you handle Kubernetes certificate expiration?',
    probing:
      'Whether you find which certificate expired, fix it through its controller and alert well before expiry.',
    answer: [
      'Monitor cert expiry, automate renewals with cert-manager, rotate cluster certs regularly, and alert on failures. Mini-case: Cert-manager auto-renewed TLS certs before expiry; a Grafana alert ensured we never missed rotation deadlines.',
      "**Detailed interview approach:** First I identify which certificate actually expired — public ingress, an internal service, the API server, kubelet, a webhook, or a client — and check its issuer, SAN, chain, secret, and expiry with `openssl s_client` or `openssl x509`, plus the relevant controller's status.",
      "For cert-manager, I check the Certificate, CertificateRequest, Order or Challenge objects, controller logs, DNS or HTTP challenge reachability, and the issuer's credentials.",
      "I renew or rotate it through the supported controller, reload the consumer, and verify the complete chain and hostname from a real client. Cluster-level certificates follow the platform's specific rotation procedure and node or control-plane sequence.",
      'Alerts at 30, 14, and 7 days out, automated renewal tests, an owner inventory, and protected issuer keys are what prevent an emergency expiry in the first place.',
    ],
    followUps: [
      'Which cert-manager objects do you inspect when renewal fails?',
      'How do you verify the full chain from a real client?',
    ],
    tags: ['certificates', 'cert-manager'],
  },
  {
    id: 'itv-myk8s-110',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce that all images come from a trusted internal registry?',
    probing:
      'Whether you enforce digests, signatures and provenance at admission, not just the registry hostname.',
    answer: [
      "CI builds the image, scans it, generates an SBOM, signs it, and pushes it to the approved registry. An admission policy tool like Kyverno, Gatekeeper, or the cloud provider's own policy engine rejects anything from a non-approved registry, and ideally requires a digest, a signature, and provenance — meaning proof of where the artifact actually came from and how it was built — rather than just checking the registry hostname, since compromised registry credentials could still push a bad tag under a trusted name.",
      'I restrict who has pull and push roles on the registry, protect the signing identity, use immutable tags with a retention policy, keep the registry on a private network, and audit access. I roll the policy out in audit mode first, test it against both compliant and noncompliant Pods, allow controlled exceptions in specific namespaces with an owner and an expiry date, and monitor denials.',
      'I also control which fields can mutate the image reference and who can use ephemeral containers or node runtime access. If the registry becomes unavailable, disaster recovery uses an approved, replicated registry — bypassing image verification is only ever a high-risk, explicitly documented emergency action.',
    ],
    followUps: [
      'How do you roll out an image policy without breaking running workloads?',
      'Why is checking the registry hostname alone not enough?',
    ],
    tags: ['supply chain', 'admission', 'registry'],
  },
  {
    id: 'itv-myk8s-111',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you isolate workloads in a multi-tenant EKS cluster?',
    probing:
      'Whether you combine namespaces with RBAC, IAM, network policy, quotas and dedicated nodes, and know when to split clusters.',
    answer: [
      "Namespaces are the first boundary, but they aren't complete hard tenancy on their own. I combine them with tenant-specific Entra or IAM groups mapped to namespaced RBAC, separate ServiceAccounts and IRSA roles, default-deny network policy, quotas and LimitRanges, Pod security and admission control, trusted images, secrets isolation, and tenant-scoped logs, metrics, and cost labels.",
      'Sensitive tenants get dedicated node groups with taints and a hardened runtime, and sometimes even separate clusters or cloud accounts when stronger isolation, compliance, or a smaller blast radius is required. Cluster-scoped resources, CRDs, webhooks, privileged Pods, and node access all stay platform-team-only.',
      'I test cross-namespace API, network, secret, and IAM access, and resource-exhaustion attempts. I audit access and review quotas regularly. Whether to share a cluster at all follows the threat model, not just cost.',
    ],
    followUps: [
      'What cluster-scoped resources must stay platform-only?',
      'When does a tenant need its own cluster or account?',
    ],
    tags: ['multi-tenancy', 'eks', 'isolation'],
  },
  {
    id: 'itv-myk8s-112',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you architect multi-tenant Kubernetes clusters securely?',
    probing:
      'Whether you can design tenant isolation with RBAC, policies, quotas and audit, and escalate to separate clusters.',
    answer: [
      'Use namespaces + strict RBAC per tenant, network policies to isolate traffic, resource quotas & limit ranges, PodSecurity admission controls, encrypt secrets, and audit logging per namespace. Consider separate clusters for high-security tenants.',
      'Mini-case: We separated dev/test tenants into namespaces with network policies; when a noisy tenant consumed CPU, quotas throttled them preventing cross-tenant impact.',
      '**Detailed interview approach:** I apply defense in depth: private or restricted API access, SSO with least-privilege RBAC, separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit and runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect an exposure, I isolate the workload, preserve audit and runtime evidence, revoke tokens or credentials, check for lateral movement, and rebuild from a trusted image.',
      'I verify both the denied and the allowed paths with real service accounts, and periodically review RBAC, unused permissions, certificate and secret rotation, patch levels, backup and restore, and any policy exceptions still open.',
    ],
    followUps: [
      'How do quotas stop a noisy tenant?',
      'How do you audit cross-tenant access attempts?',
    ],
    tags: ['multi-tenancy', 'security'],
  },
  {
    id: 'itv-myk8s-113',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you detect and stop crypto-mining workloads in Kubernetes?',
    probing:
      'Whether you can detect abnormal runtime behaviour, contain the workload and close the entry point.',
    answer: [
      'Enable anomaly detection (Falco/Azure Defender), restrict containers from running privileged mode, enforce quotas, and monitor unusual CPU spikes. Mini-case: A compromised pod started crypto-mining; Falco detected suspicious syscalls and Kubernetes killed the pod within seconds.',
      '**Detailed interview approach:** I apply defense in depth: private or restricted API access, SSO with least-privilege RBAC, separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit and runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect an exposure, I isolate the workload, preserve audit and runtime evidence, revoke tokens or credentials, check for lateral movement, and rebuild from a trusted image.',
      'I verify both the denied and the allowed paths with real service accounts, and periodically review RBAC, unused permissions, certificate and secret rotation, patch levels, backup and restore, and any policy exceptions still open.',
    ],
    followUps: [
      'Which Falco signals would point to crypto-mining?',
      'How do you preserve evidence before deleting the Pod?',
    ],
    tags: ['runtime security', 'falco', 'incidents'],
  },
  {
    id: 'itv-myk8s-114',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce compliance in Kubernetes clusters?',
    probing:
      'Whether you turn requirements into tested, layered policy with owned, expiring exceptions.',
    answer: [
      'Use OPA/Gatekeeper or Kyverno for policy enforcement → Restrict images, namespaces, resource limits.',
      '**Detailed interview approach:** I translate requirements into versioned, testable controls at several layers: source and branch rules, CI scanners, Terraform plan policy, Kubernetes admission policy, and cloud-native organization policy.',
      'Typical examples require encryption, approved regions and images, non-root Pods, resource limits, labels and tags, private exposure, and least-privilege identity.',
      'Each rule has unit tests with both allowed and denied fixtures, and produces an actionable reason plus a fix. Hard violations block the change, while approved exceptions are scoped, owned, and set to expire automatically.',
      'Runtime and audit monitoring catches any change that happens outside CI. I track exceptions, false positives, and time to remediate, and periodically map the evidence back to each control, so compliance actually reflects real risk reduction rather than just a checklist.',
    ],
    followUps: [
      'How do you test a Kyverno or Gatekeeper policy before enforcing it?',
      'How do you report compliance evidence to auditors?',
    ],
    tags: ['compliance', 'policy as code'],
  },
  {
    id: 'itv-myk8s-115',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage multiple Kubernetes clusters securely?',
    probing:
      'Whether you standardise identity, RBAC and policy across clusters while keeping each cluster least-privilege.',
    answer: [
      'Use Rancher, Anthos, or Azure Arc → Apply consistent RBAC & policies → Centralized monitoring/logging.',
      '**Detailed interview approach:** I apply defense in depth: private or restricted API access, SSO with least-privilege RBAC, separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit and runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect an exposure, I isolate the workload, preserve audit and runtime evidence, revoke tokens or credentials, check for lateral movement, and rebuild from a trusted image.',
      'I verify both the denied and the allowed paths with real service accounts, and periodically review RBAC, unused permissions, certificate and secret rotation, patch levels, backup and restore, and any policy exceptions still open.',
    ],
    followUps: [
      'How do you keep policy consistent across a fleet?',
      'How do you manage kubeconfig access for many clusters?',
    ],
    tags: ['multi-cluster', 'security'],
  },
  {
    id: 'itv-myk8s-116',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure CI/CD pipelines running in Kubernetes?',
    probing:
      'Whether you isolate build agents, scope credentials and handle a leaked secret properly.',
    answer: [
      'Run pipelines as non-root → Restrict namespaces → Use Pod Security Admission (PodSecurityPolicy was removed in Kubernetes 1.25)/OPA → Isolate sensitive workloads.',
      '**Detailed interview approach:** I use SSO and MFA, role-based authorization, CSRF protection, TLS, a private controller, patched core and plugins, and I never run builds directly on the controller.',
      'Credentials live in Jenkins Credentials or an external vault, scoped to the smallest folder or job that needs them. Pipelines use `withCredentials`, avoid shell tracing, and never interpolate a secret into a command line or artifact.',
      "Agents are ephemeral, isolated, non-root where possible, and get a short-lived cloud identity. If a secret ever shows up in the logs, masking isn't enough — I stop the exposure, revoke and rotate the credential, restrict or delete the retained logs where policy allows, audit where it was used, and fix the step that printed it.",
      'Configuration, plugins, and the restore process are all backed up and tested.',
    ],
    followUps: [
      'Why should builds never run on the Jenkins controller?',
      'How do ephemeral agents reduce risk?',
    ],
    tags: ['ci/cd', 'security', 'jenkins'],
  },
  {
    id: 'itv-myk8s-117',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you connect Jenkins to a Kubernetes cluster?',
    probing:
      'Whether you give Jenkins a scoped identity or use GitOps, never a cluster-admin kubeconfig.',
    answer: [
      'I prefer a short-lived cloud or workload identity mapped to Kubernetes RBAC, or better yet a GitOps setup where Jenkins just updates Git and a controller does the actual deploy. If Jenkins does connect directly, it gets a dedicated ServiceAccount and role limited to a specific namespace, resources, and verbs, a protected credential scope, and an isolated deployment agent — never a `cluster-admin` kubeconfig.',
      "The Jenkins Kubernetes plugin might also spin up ephemeral build agents, but that's separate from deployment access. The pipeline verifies the context and namespace, renders and diffs the manifests, deploys, checks rollout and smoke tests, and logs everything for audit.",
      'For an authentication failure, I check the credential, IAM token, or OIDC setup, the kubeconfig context, API DNS, network, CA, and time sync, and RBAC with `kubectl auth can-i`. I test both an allowed and a denied operation. I rotate tokens regularly, restrict who can approve the production stage, and never print a kubeconfig or token in the logs.',
    ],
    tags: ['jenkins', 'rbac', 'ci/cd'],
  },
]
