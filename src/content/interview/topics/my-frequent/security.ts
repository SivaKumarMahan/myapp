import type { InterviewQuestion } from '../../../types'

/** Application security and secrets management. */
export const myFrequentSecurityQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myfaq-1',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you implement strong security for your applications?',
    probing:
      'Whether you think in layers - identity, secrets, network, code, pipeline, image, cluster, data - rather than naming one tool.',
    answer: [
      'I protect an application at multiple levels. I secure the code, identity, secrets, network, container image, Kubernetes configuration, data, and CI/CD pipeline. One control alone is not enough.',
      'The request path I protect runs from the user through the Web Application Firewall and Application Gateway to the AKS Service, the Pod, and finally the database or storage.',
      "**Example:** suppose an AKS application needs to read a database password. I store the password in Key Vault, assign the application's workload identity permission to read it, restrict network access to the vault, and monitor secret-access failures. The password is not stored in Git, the image, or the pipeline.",
      '**In short:** I use layered security: least-privilege identity, Key Vault for secrets, restricted networks, secure coding, CI/CD scans, non-root containers, Kubernetes policies, encryption, patching, and monitoring.',
      'I test these controls regularly and respond quickly when a vulnerability or secret leak is detected.',
    ],
    code: [
      {
        title: 'Layers a request passes through',
        language: 'text',
        code: `User
-> Web Application Firewall
-> Application Gateway
-> AKS Service
-> Pod
-> Database or Storage`,
      },
    ],
    traps: [
      'Hardcoding secrets.',
      'Giving owner or administrator access unnecessarily.',
      'Running containers as root.',
      'Using the `latest` image tag.',
      'Opening firewall access to everyone.',
      'Ignoring failed security scans.',
      'Logging passwords, tokens, or personal data.',
      'Assuming a successful deployment is automatically secure.',
    ],
    followUps: [
      'How do you give an AKS application access to Key Vault without a password?',
      'What security checks does your pipeline run before deployment?',
    ],
    tags: ['security', 'best practices'],
  },
  {
    id: 'itv-myfaq-2',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you handle identity and access for users and applications?',
    probing:
      'Least privilege in practice: Entra ID for people, managed or workload identity for apps, RBAC scoped to the need.',
    answer: [
      'I follow least privilege: users and applications receive only the permissions they need.',
      '- Use Microsoft Entra ID for user and administrator access.\n- Use managed identity or workload identity for applications.\n- Use Kubernetes RBAC for cluster access.\n- Require multi-factor authentication for important accounts.\n- Review and remove unused access.',
      '**Example:** an application that only reads one Key Vault secret receives permission to read that secret. It does not receive owner access to the subscription.',
    ],
    tags: ['security', 'identity', 'rbac'],
  },
  {
    id: 'itv-myfaq-3',
    level: 'basic',
    kind: 'open',
    prompt: 'Where do you store application secrets, and where must they never appear?',
    probing:
      'That secrets live in a vault the app reaches with its own identity, and that you know every place they commonly leak.',
    answer: [
      'I store passwords, API keys, and certificates in Azure Key Vault. I do not store them in:',
      '- Source code.\n- Dockerfiles.\n- Git repositories.\n- Pipeline YAML.\n- Plain Kubernetes manifests.',
      'The application accesses Key Vault using its identity, so it does not need a saved password.',
      'I avoid displaying secret values during normal troubleshooting and ensure that pipeline logs mask them.',
    ],
    code: [
      {
        title: 'Read a secret from Key Vault',
        language: 'bash',
        code: `az keyvault secret show \\
  --vault-name <vault-name> \\
  --name <secret-name>`,
      },
    ],
    tags: ['security', 'secrets', 'key vault'],
  },
  {
    id: 'itv-myfaq-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you protect an application at the network level?',
    probing:
      'Only required traffic allowed: HTTPS, WAF at the edge, private endpoints, NSGs and Kubernetes NetworkPolicies between workloads.',
    answer: [
      'I allow only required traffic.',
      '- Use HTTPS for external and internal sensitive traffic.\n- Place Application Gateway and WAF in front of public applications.\n- Use private endpoints for Key Vault, databases, and storage when required.\n- Use firewall and Network Security Group rules.\n- Use Kubernetes NetworkPolicies to restrict Pod-to-Pod access.',
      'The example NetworkPolicy selects the database Pods and allows incoming traffic only from Pods labelled `app: api` in the same namespace.',
    ],
    code: [
      {
        title: 'NetworkPolicy: only the API may reach the database',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-database
spec:
  podSelector:
    matchLabels:
      app: database
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api`,
      },
    ],
    tags: ['security', 'networking', 'networkpolicy'],
  },
  {
    id: 'itv-myfaq-5',
    level: 'basic',
    kind: 'open',
    prompt: 'What secure coding practices do you expect developers to follow?',
    probing:
      'Awareness of the basic application-layer defences, especially input validation and parameterized queries against SQL injection.',
    answer: [
      'Developers should follow these practices:',
      '- Validate user input.\n- Use parameterized database queries.\n- Apply authentication and authorization on the server.\n- Avoid returning sensitive details in error messages.\n- Keep dependencies updated.\n- Set safe timeouts and request-size limits.',
      'For example, parameterized queries help prevent SQL injection. The user input is treated as data, not as part of the SQL command.',
    ],
    code: [
      {
        title: 'Parameterized query',
        language: 'text',
        code: `SELECT * FROM users WHERE email = ?`,
      },
    ],
    tags: ['security', 'secure coding'],
  },
  {
    id: 'itv-myfaq-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What security checks does your CI/CD pipeline run before deployment?',
    probing:
      'That security is a gate in the pipeline - a serious finding fails the build - and that the pipeline itself is protected.',
    answer: [
      'My pipeline runs security checks before deployment: unit tests, code scan, dependency scan, secret scan and container-image scan, and only then deployment.',
      'If a serious issue is found, the pipeline fails and the image is not promoted.',
      'In addition to the scans, I also:',
      '- Protect the `main` branch.\n- Require pull-request review.\n- Use protected Production environments.\n- Keep CI/CD permissions limited.\n- Use approved and pinned pipeline actions or plugins.',
    ],
    code: [
      {
        title: 'Security checks in the pipeline',
        language: 'text',
        code: `code
-> unit tests
-> code scan
-> dependency scan
-> secret scan
-> container-image scan
-> deployment`,
      },
    ],
    tags: ['security', 'ci/cd', 'devsecops'],
  },
  {
    id: 'itv-myfaq-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure container images and Kubernetes workloads?',
    probing:
      'Concrete hardening: small pinned non-root images, scanning, and a restrictive securityContext plus RBAC, namespaces and policies.',
    answer: [
      'I keep container images small and secure:',
      '- Use a trusted base image.\n- Use a specific image version.\n- Run as a non-root user.\n- Remove unnecessary tools.\n- Scan the image before deployment.\n- Rebuild when the base image receives a security fix.',
      'In Kubernetes I set a secure container configuration (non-root, no privilege escalation, read-only root filesystem, all capabilities dropped). I also use:',
      '- Resource requests and limits.\n- Separate namespaces.\n- RBAC with minimum permissions.\n- NetworkPolicies.\n- Admission policies.\n- Regular AKS and node upgrades.',
      'I do not run a privileged container unless there is a proven requirement.',
    ],
    code: [
      {
        title: 'Non-root NGINX image',
        language: 'dockerfile',
        code: `FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --chown=101:101 ./dist /usr/share/nginx/html
USER 101`,
      },
      {
        title: 'Container securityContext',
        language: 'yaml',
        code: `securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL`,
      },
    ],
    tags: ['security', 'containers', 'kubernetes'],
  },
  {
    id: 'itv-myfaq-8',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you protect data, monitor for security events and manage patching?',
    probing:
      'The operational side of security: encryption, backups, alerting with owners, and a tested patch cadence.',
    answer: [
      '**Data protection.** I protect data both when stored and while travelling:',
      '- Encryption at rest.\n- TLS in transit.\n- Database access through application identity.\n- Backups and restore testing.\n- Limited administrator access.\n- Audit logging.',
      'Sensitive data should not appear in application or pipeline logs.',
      '**Monitoring and alerts.** I monitor:',
      '- Failed logins.\n- Unexpected permission changes.\n- WAF blocks.\n- Container and dependency vulnerabilities.\n- Unusual network traffic.\n- Key Vault access failures.\n- Kubernetes audit and security events.',
      'An alert must have an owner and a clear response step.',
      '**Patch management.** I regularly update:',
      '- Application dependencies.\n- Container base images.\n- AKS versions.\n- Worker-node images.\n- Operating systems and build tools.',
      'Updates are tested in a lower environment before Production.',
    ],
    tags: ['security', 'monitoring', 'patching'],
  },
  {
    id: 'itv-myfaq-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage secrets in your project?',
    probing:
      'Key Vault plus identity-based access, per-environment vaults, and that no secret value lives in Git, images, YAML or Terraform code.',
    answer: [
      'I store Production secrets in Azure Key Vault and let applications access them through managed identity or AKS Workload Identity. I do not store secret values in Git, Docker images, pipeline YAML, or Terraform code.',
      'The basic flow: the application proves its identity, Azure Key Vault checks permission, and the application reads the required secret. The application receives access without storing a long-lived Azure username and password.',
      'I use separate vaults for environments such as Development and Production. This prevents a Development identity from reading Production secrets and makes access easier to review.',
      'In real use, I avoid typing secrets directly into commands that may be saved in shell history. I use an approved secure input or automation method.',
      '**Example:** suppose an AKS orders API needs a PostgreSQL password. I store it in the Production Key Vault, give only the orders API workload identity permission to read it, and mount it through the CSI driver. The value never appears in Git or the container image. When I rotate it, I create the new value, verify the application, and then revoke the old one.',
      '**In short:** I store secrets in Azure Key Vault, use managed identity or AKS Workload Identity, and grant only the required read permission. Applications retrieve secrets directly or through the CSI driver. Pipeline secrets stay in protected credential stores, and I use rotation, expiration alerts, private networking, audit logs, soft delete, and a tested response process for leaks.',
    ],
    code: [
      {
        title: 'Basic flow',
        language: 'text',
        code: `Application
-> proves its identity
-> Azure Key Vault checks permission
-> application reads the required secret`,
      },
      {
        title: 'One vault per environment',
        language: 'text',
        code: `kv-project-development
kv-project-production`,
      },
      {
        title: 'Create or update a secret',
        language: 'bash',
        code: `az keyvault secret set \\
  --vault-name <vault-name> \\
  --name <secret-name> \\
  --value <secret-value>`,
      },
    ],
    traps: [
      'Hardcoding secrets.',
      'Committing `.env` files.',
      'Printing secrets in logs.',
      'Giving every application access to the entire vault.',
      'Using long-lived service-principal passwords when identity is available.',
      'Storing Production values in a Development vault.',
      'Forgetting rotation and expiration alerts.',
      'Assuming Kubernetes base64 values are encrypted.',
    ],
    tags: ['secrets', 'key vault', 'identity'],
  },
  {
    id: 'itv-myfaq-10',
    level: 'basic',
    kind: 'open',
    prompt: 'What counts as a secret, and how is it different from configuration?',
    probing:
      'Whether you can separate sensitive values from ordinary settings, so each is stored and handled correctly.',
    answer: [
      'Examples of secrets include:',
      '- Database passwords.\n- API keys.\n- Access tokens.\n- Private certificates and keys.\n- Storage credentials.\n- Webhook tokens.',
      'Normal values such as an application URL, feature flag, or log level are configuration, not secrets.',
    ],
    tags: ['secrets', 'configuration'],
  },
  {
    id: 'itv-myfaq-11',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does an AKS application authenticate to Key Vault with Workload Identity?',
    probing:
      'Separating authentication (who is the app) from authorization (what may it do), and the ServiceAccount-to-managed-identity wiring.',
    answer: [
      'There are two separate questions:',
      '1. **Who is the application?** Managed identity or workload identity answers this.\n2. **What may it do?** Azure RBAC gives only the required Key Vault permission.',
      "For example, an orders API may read only its database secret. It does not receive permission to delete the vault or read every team's secrets.",
      'For an AKS application, I connect a Kubernetes ServiceAccount to an Azure managed identity with the `azure.workload.identity/client-id` annotation. The Deployment\'s Pod template carries the `azure.workload.identity/use: "true"` label and uses that ServiceAccount.',
      'The application can then request a token for its identity and read permitted Key Vault secrets.',
    ],
    code: [
      {
        title: 'ServiceAccount linked to a managed identity',
        language: 'yaml',
        code: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: orders-api
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<managed-identity-client-id>"`,
      },
      {
        title: 'Pod template using the ServiceAccount',
        language: 'yaml',
        code: `spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: orders-api`,
      },
    ],
    followUps: [
      'What has to exist on the Azure side for the token exchange to work (federated credential, OIDC issuer)?',
      'How would you prove which identity a Pod is actually using?',
    ],
    tags: ['secrets', 'workload identity', 'aks'],
  },
  {
    id: 'itv-myfaq-12',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are the two ways an AKS application can consume Key Vault secrets?',
    probing:
      'Trade-off between the app calling Key Vault itself and the Secrets Store CSI Driver mounting values as files.',
    answer: [
      '**Option 1: Application reads Key Vault directly.** The application uses the Azure SDK and its workload identity. This is useful when:',
      '- The application already supports Key Vault.\n- The latest secret value is needed at runtime.\n- The application can handle retries and secret refresh.',
      '**Option 2: Secrets Store CSI Driver.** The CSI driver can mount Key Vault values as files inside the Pod. I define a `SecretProviderClass`, mount it as a read-only CSI volume, and the application reads the value from a file such as `/mnt/secrets/database-password`.',
    ],
    code: [
      {
        title: 'SecretProviderClass',
        language: 'yaml',
        code: `apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: orders-api-secrets
  namespace: production
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    clientID: "<managed-identity-client-id>"
    keyvaultName: "<vault-name>"
    tenantId: "<tenant-id>"
    objects: |
      array:
        - |
          objectName: database-password
          objectType: secret`,
      },
      {
        title: 'Mount the secrets volume in the Pod',
        language: 'yaml',
        code: `volumeMounts:
  - name: secrets
    mountPath: /mnt/secrets
    readOnly: true
volumes:
  - name: secrets
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: orders-api-secrets`,
      },
      {
        title: 'File the application reads',
        language: 'text',
        code: `/mnt/secrets/database-password`,
      },
      {
        title: 'Optional: sync the value into a Kubernetes Secret for an env var',
        language: 'yaml',
        code: `spec:
  secretObjects:
    - secretName: orders-api-db
      type: Opaque
      data:
        - objectName: database-password
          key: DB_PASSWORD`,
      },
    ],
    deeper: [
      'If the application needs an environment variable, the SecretProviderClass can also sync the value into a Kubernetes Secret with `secretObjects`.',
      'The synced Secret exists only while at least one Pod mounts the CSI volume.',
      'Syncing stores the value in etcd too, so I prefer reading the mounted file.',
      'If the fetch fails (wrong permission, DNS, or secret name), the Pod stays in `ContainerCreating` and `kubectl describe pod` shows a `FailedMount` event.',
    ],
    followUps: [
      'How does the application pick up a rotated value with each option?',
      'When would you also sync the mounted value into a Kubernetes Secret?',
    ],
    tags: ['secrets', 'csi driver', 'aks'],
  },
  {
    id: 'itv-myfaq-13',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Are Kubernetes Secrets secure enough on their own?',
    probing:
      'Knowing that base64 is encoding, not encryption, and what you add around Kubernetes Secrets.',
    answer: [
      'A Kubernetes Secret is useful for applications that require Kubernetes-native secret references, but base64 encoding is not encryption by itself.',
      'If Kubernetes Secrets are used, I enable encryption at rest, restrict RBAC, avoid committing values to Git, and prefer an external secret source.',
      '`kubectl auth can-i` helps verify whether a ServiceAccount has secret access, and I restrict RBAC to the one Secret the workload needs.',
      '- **Encryption at rest:** AKS encrypts etcd storage at the platform level. For an extra layer with my own key, I enable KMS etcd encryption with a Key Vault key (`--enable-azure-keyvault-kms`).\n- **Volume over env var:** a mounted file can be updated without a restart, and env vars leak more easily through crash dumps, debug output, and `kubectl describe`.',
      '**GitOps without plain values in Git:**',
      '- **Sealed Secrets** encrypts the Secret so the encrypted file is safe to commit. Only the controller in the cluster can decrypt it.\n- **External Secrets Operator** syncs values from Key Vault (or Vault, AWS Secrets Manager) into Kubernetes Secrets.\n- **Key Vault CSI driver** (my default on AKS) does not need a Secret object at all.',
    ],
    code: [
      {
        title: 'Check whether a ServiceAccount can read Secrets',
        language: 'bash',
        code: `kubectl auth can-i get secrets \\
  --as=system:serviceaccount:production:orders-api \\
  -n production`,
      },
      {
        title: 'RBAC limited to one Secret',
        language: 'yaml',
        code: `rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["orders-api-db"]
    verbs: ["get"]`,
      },
    ],
    tags: ['secrets', 'kubernetes', 'rbac'],
  },
  {
    id: 'itv-myfaq-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle secrets in CI/CD pipelines?',
    probing:
      'Protected credential stores per platform, masking, scoping to jobs and protected branches, and preferring short-lived identity.',
    answer: [
      "Pipeline secrets are stored in the platform's protected credential store or retrieved from Key Vault. Examples:",
      '- Jenkins Credentials.\n- Azure DevOps secret variables or variable groups.\n- GitHub Actions Secrets or environment secrets.\n- GitLab protected and masked variables.',
      'The pipeline itself should:',
      '- Mask secret values in logs.\n- Limit secrets to the required job.\n- Restrict Production secrets to protected environments or branches.\n- Prefer short-lived identity-based access.',
      'I never write a plain password value into pipeline YAML.',
    ],
    code: [
      {
        title: 'What I do not write in pipeline YAML',
        language: 'yaml',
        code: `password: <hardcoded-production-password>`,
      },
    ],
    tags: ['secrets', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you provision Key Vault with Terraform and secure its network access?',
    probing:
      'Terraform creates the vault, identities and permissions but not the secret values; state and the vault network are protected.',
    answer: [
      'Terraform creates Key Vaults, identities, and permissions, but I avoid putting normal application secret values directly in Terraform code. I enable soft delete retention and purge protection on the vault.',
      'Terraform state can contain sensitive data, so it is stored in a private, protected backend.',
      'For sensitive environments, Key Vault uses:',
      '- Private endpoint.\n- Private DNS.\n- Restricted public access.\n- Firewall rules.',
      'The AKS network must be able to resolve and reach the private Key Vault address.',
    ],
    code: [
      {
        title: 'Key Vault with purge protection',
        language: 'hcl',
        code: `resource "azurerm_key_vault" "production" {
  name                = "kv-project-production"
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  soft_delete_retention_days = 90
  purge_protection_enabled   = true
}`,
      },
    ],
    tags: ['secrets', 'terraform', 'key vault'],
  },
  {
    id: 'itv-myfaq-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you rotate secrets without breaking the application?',
    probing:
      'An ordered rotation that creates the new value before revoking the old one, plus expiry alerts and recovery protection.',
    answer: [
      'Rotation means replacing an old secret with a new one. My process is:',
      '1. Create the new secret version.\n2. Let the application read the new value.\n3. Test the application.\n4. Revoke the old value.\n5. Monitor for failures.',
      'For a database password, the database and application change must be coordinated so the application does not lose access. I alert before certificates or secrets expire.',
      'I enable Key Vault soft delete and purge protection, and I document who can recover a deleted secret or vault. A backup does not replace rotation: if a credential is exposed, restoring the old exposed value would not make it safe.',
    ],
    tags: ['secrets', 'rotation', 'key vault'],
  },
  {
    id: 'itv-myfaq-17',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'An application cannot read its secret from Key Vault. How do you troubleshoot it?',
    probing:
      'A structured walk through identity, permission, network, secret name and CSI driver events rather than guessing.',
    answer: [
      'If an application cannot read a secret, I check each layer in order.',
      '**Identity:** is the Pod using the expected ServiceAccount and managed identity?',
      '**Permission:** does that identity have permission to read the required secret in the correct vault?',
      '**Network:** can the Pod resolve and reach the Key Vault endpoint? Are private DNS and firewall settings correct?',
      '**Secret name:** does the secret exist, and is the application using the correct name and version?',
      '**CSI Driver:** the Pod Events may show identity, permission, or mount errors.',
    ],
    code: [
      {
        title: 'Check the Pod identity',
        language: 'bash',
        code: `kubectl get pod <pod-name> -n <namespace> -o yaml
kubectl get serviceaccount <service-account> -n <namespace> -o yaml`,
      },
      {
        title: 'Check CSI driver events',
        language: 'bash',
        code: `kubectl describe pod <pod-name> -n <namespace>
kubectl get secretproviderclass -n <namespace>`,
      },
    ],
    followUps: [
      'How would you tell a DNS problem from a permission problem from the error alone?',
      'What changes if the vault has public access disabled?',
    ],
    tags: ['secrets', 'troubleshooting', 'key vault'],
  },
  {
    id: 'itv-myfaq-18',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A secret has been exposed, for example committed to Git. What do you do?',
    probing:
      'Treating an exposed secret as compromised: rotate first, investigate use, then clean history and prevent recurrence.',
    answer: [
      'I treat an exposed secret as compromised. I do not only delete it from Git, because it may still exist in history or logs. I:',
      '1. Revoke or rotate the secret immediately.\n2. Check where it was used, and review access logs and affected systems.\n3. Update the application safely with the replacement.\n4. Remove the exposed value from source history where required.\n5. Add a secret scan or control to prevent recurrence.',
      'Deleting the visible line from Git is not enough because the value may remain in history or logs.',
    ],
    traps: [
      'Deleting the line from the latest commit and considering the incident closed.',
      'Restoring the old value from backup - an exposed credential is not made safe by recovery.',
    ],
    followUps: [
      'How would you remove the value from Git history, and what does that not fix?',
      'Which scanner would you add to the pipeline, and at which stage?',
    ],
    tags: ['secrets', 'incident', 'security'],
  },
  {
    id: 'itv-myfaq-300',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Find the security problems in this pipeline snippet. What is wrong with this?',
    promptCode: [
      {
        title: 'Pipeline snippet under review',
        language: 'yaml',
        code: `env:
  - name: DB_PASSWORD
    value: "<hardcoded-production-password>"

variables:
  azureSubscription: "prod-subscription"`,
      },
    ],
    probing:
      'Spotting the plain-text Production password and its consequences, and not being distracted by the service connection name.',
    answer: [
      'The main problem is a Production password in plain text in source control.',
      '- **Hardcoded password:** anyone with repo access can read it. Fix: Key Vault.\n- **It is in Git:** it stays in history even after deleting the line. Fix: rotate it, then clean history.\n- **Not a secret variable:** it is not masked in logs. Fix: Key Vault or secret variable.\n- **Plain env var:** visible in `kubectl describe`, dumps, debug output. Fix: mounted file from Key Vault CSI.\n- **No rotation:** hardcoded values never change. Fix: Key Vault with rotation.\n- **Service connection may be over-privileged:** a pipeline compromise becomes an Azure compromise. Fix: least-privilege RBAC, workload identity federation, approvals.',
      'In the fixed version, the pipeline reads the secret from Key Vault with the `AzureKeyVault@2` task.',
      'Remember: `azureSubscription: prod-subscription` is not a secret. It is just the name of the service connection. The real question is what permissions the identity behind it has.',
    ],
    code: [
      {
        title: 'Fixed version',
        language: 'yaml',
        code: `- task: AzureKeyVault@2
  inputs:
    azureSubscription: prod-service-connection
    KeyVaultName: kv-project-production
    SecretsFilter: 'DB-PASSWORD'`,
      },
    ],
    traps: [
      'Calling the service connection name a leaked secret - it is only a name.',
      'Deleting the line and not rotating the password.',
    ],
    tags: ['security', 'secrets', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-301',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you scan container images with Trivy? Explain in detail how you use it.',
    probing:
      'Where the scan sits in the pipeline, which flags make it a real gate, and how findings and exceptions are handled.',
    answer: [
      'Trivy scans the built image for known CVEs in OS packages (Debian, Alpine) and application libraries (Maven, npm, pip). It can also find secrets and misconfigurations. I run it after `docker build` and before the push to ACR, so a failed image never reaches the registry.',
      '- **`--severity HIGH,CRITICAL`:** only report what our policy blocks.\n- **`--exit-code 1`:** fail the pipeline when findings exist. Without it, Trivy prints the table and exits 0.\n- **`--ignore-unfixed`:** skip CVEs that have no fixed version yet (track them separately).\n- **`--format sarif` or `json --output report.json`:** report for the security dashboard.\n- **`--scanners vuln,secret,misconfig`:** choose what to scan.',
      'When a HIGH or CRITICAL is found:',
      '1. Upgrade the base image or the dependency, rebuild, rescan.\n2. If there is no fix, check if the package is actually used, and raise an exception.\n3. An exception goes in `.trivyignore` with a reason, owner, approval, and expiry date. An undocumented ignore list is a bad practice.',
    ],
    deeper: [
      'Trivy and SonarQube do different jobs. SonarQube checks our source code. Trivy checks the image and its dependencies.',
      'New CVEs are published after the build, so I also rescan images in the registry (scheduled Trivy job or Defender for Containers on ACR).',
      'Pin the Trivy version (or image digest) in the pipeline. Security tools are part of the supply chain too.',
    ],
    code: [
      {
        title: 'Where Trivy sits',
        language: 'text',
        code: `docker build -> trivy image -> pass -> push to ACR -> deploy to AKS
                            -> fail -> pipeline stops`,
      },
      {
        title: 'Image scan as a pipeline gate',
        language: 'bash',
        code: `trivy image \\
  --severity HIGH,CRITICAL \\
  --ignore-unfixed \\
  --exit-code 1 \\
  orders-api:$(Build.BuildId)`,
      },
      {
        title: 'Other Trivy commands',
        language: 'bash',
        code: `trivy fs .                    # dependencies and secrets in the repo
trivy config ./terraform      # IaC misconfigurations (tfsec is now part of Trivy)
trivy image myacr.azurecr.io/orders-api:1.4.0   # rescan an image already in ACR`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Trivy as an image gate',
        caption: 'A failed scan stops the pipeline before the image reaches the registry.',
        nodes: [
          { label: 'docker build' },
          {
            label: 'trivy image',
            detail: 'HIGH and CRITICAL, exit code 1',
            tone: 'accent',
            branch: { label: 'Findings: pipeline stops', tone: 'danger' },
          },
          { label: 'Push to ACR', arrowLabel: 'pass', tone: 'success' },
          { label: 'Deploy to AKS' },
        ],
      },
    ],
    followUps: [
      'How do you handle a CRITICAL CVE that has no fix yet?',
      'How do you catch a CVE published after the image was already deployed?',
    ],
    tags: ['security', 'trivy', 'containers', 'devsecops'],
  },
  {
    id: 'itv-myfaq-302',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Instead of SonarQube and Trivy, what commercial (non-open-source) tools can you use?',
    probing:
      'Grouping tools by the kind of check (SAST, SCA, image, IaC, secrets, DAST) and knowing that the gate policy matters more than the brand.',
    answer: [
      'I group them by the type of check:',
      '- **SAST (our code):** open source SonarQube Community. Commercial: Checkmarx One, Veracode, Coverity, GitHub Advanced Security (CodeQL).\n- **SCA (dependencies):** open source OWASP Dependency-Check. Commercial: Snyk Open Source, Mend.io, Black Duck SCA, JFrog Xray.\n- **Container image:** open source Trivy. Commercial: Snyk Container, Prisma Cloud, Aqua, JFrog Xray, Defender for Containers.\n- **IaC:** open source Checkov, Trivy. Commercial: Prisma Cloud, Snyk IaC, Checkmarx One.\n- **Secrets:** open source Gitleaks. Commercial: GitHub Advanced Security secret scanning.\n- **DAST (running app):** open source OWASP ZAP. Commercial: Veracode DAST, Burp Suite Enterprise.',
      'In Azure DevOps, the easiest commercial option is GitHub Advanced Security for Azure DevOps (now offered as two products, Secret Protection and Code Security).',
      'These are not one-to-one replacements. SonarQube is mainly code quality. Checkmarx and Veracode focus on security, so many teams keep SonarQube and add a security tool.',
      'The gate policy matters more than the tool: for example, fail on Critical and High, allow Medium with a ticket. I store tool tokens in a service connection or Key Vault, and I say clearly which tools I used hands-on (SonarQube, Trivy, Checkov) and which I only know.',
    ],
    code: [
      {
        title: 'GitHub Advanced Security for Azure DevOps',
        language: 'yaml',
        code: `- task: AdvancedSecurity-Codeql-Init@1
  inputs:
    languages: java
- task: AdvancedSecurity-Codeql-Autobuild@1
- task: AdvancedSecurity-Dependency-Scanning@1
- task: AdvancedSecurity-Codeql-Analyze@1`,
      },
    ],
    tags: ['security', 'devsecops', 'tools'],
  },
  {
    id: 'itv-myfaq-303',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Apart from pre-commit hooks, what other checks do you use, inside and outside Git?',
    probing:
      'Knowing that local hooks can be bypassed, and placing each control at the right layer: Git server, CI, cluster admission, Azure governance.',
    answer: [
      'Pre-commit is only the first layer. Local hooks can be skipped with `--no-verify`, so every important check also runs in CI and is enforced again at the cluster and Azure level.',
      '- **Local Git hooks:** `pre-commit`, `commit-msg`, `pre-push`. Format, lint, secret scan, commit message rules, quick tests.\n- **Server-side Git:** `pre-receive`, `update`, `post-receive`; branch policies, push protection. Block bad pushes, require PR review and build validation.\n- **CI pipeline:** SonarQube, OWASP Dependency-Check, Trivy, Checkov, TFLint, Hadolint, ShellCheck, kubeconform. Code, dependency, image, IaC, and manifest checks with a gate.\n- **Kubernetes admission:** Pod Security Admission, Kyverno, OPA Gatekeeper (Azure Policy for AKS). Deny privileged Pods, missing limits, unapproved registries.\n- **Azure governance:** Azure Policy. Deny public Storage Accounts, unapproved regions, missing tags.',
      'Remember: say where each control lives. SonarQube is a CI quality gate, Kyverno works at cluster admission, and Azure Policy works on Azure resources. None of them are Git hooks.',
    ],
    code: [
      {
        title: '.pre-commit-config.yaml (pin each rev to a current release)',
        language: 'yaml',
        code: `repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: check-yaml
      - id: check-merge-conflict
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.96.1
    hooks:
      - id: terraform_fmt
      - id: terraform_validate`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Where each check is enforced',
        caption: 'Local hooks can be skipped, so the same rules are enforced again further along.',
        nodes: [
          { label: 'Local Git hooks', detail: 'pre-commit, commit-msg, pre-push' },
          { label: 'Server-side Git', detail: 'branch policies, push protection' },
          { label: 'CI pipeline', detail: 'SonarQube, Trivy, Checkov gates' },
          { label: 'Kubernetes admission', detail: 'Pod Security, Kyverno, Gatekeeper' },
          { label: 'Azure Policy', detail: 'rules on Azure resources', tone: 'accent' },
        ],
      },
    ],
    tags: ['security', 'git hooks', 'devsecops'],
  },
  {
    id: 'itv-myfaq-304',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Policy, and how is it different from RBAC?',
    probing:
      'The difference between who may act (RBAC) and what configuration is allowed (Policy), plus the main policy effects.',
    answer: [
      'Azure Policy is a governance service. It checks resource configuration and can audit, deny, or fix it.',
      '- **RBAC:** who can do what.\n- **Azure Policy:** what configuration is allowed, whoever does it.',
      '**Effects** an Azure Policy can have:',
      '- **Audit / AuditIfNotExists:** allows it, marks it non-compliant.\n- **Deny:** blocks create or update.\n- **Modify:** adds or changes properties, for example tags.\n- **DeployIfNotExists:** deploys a missing setting, for example diagnostic settings.\n- **Disabled:** not evaluated.',
      'Common policies I use: deny public Storage Accounts, allowed regions, required tags, HTTPS only, allowed VM SKUs, and the AKS policy initiative (no privileged containers, only images from our ACR).',
    ],
    deeper: [
      'Start with Audit, review the results, then switch to Deny, so existing deployments do not break.',
      'Group policies into an initiative and assign it at management group level.',
      'Modify and DeployIfNotExists need a managed identity and a remediation task for existing resources.',
    ],
    code: [
      {
        title: 'RBAC allows it, Policy still blocks it',
        language: 'text',
        code: `Developer has Contributor
-> creates a Storage Account with public network access
-> Azure Policy: Deny`,
      },
      {
        title: 'Assign a policy',
        language: 'bash',
        code: `az policy assignment create \\
  --name deny-public-storage \\
  --policy <policy-definition-id> \\
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-prod`,
      },
    ],
    tags: ['azure policy', 'governance', 'rbac'],
  },
  {
    id: 'itv-myfaq-305',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Storage Account has become public. How do you fix it?',
    probing:
      'Knowing the two meanings of public, investigating exposure, and fixing the code and policy so it does not come back.',
    answer: [
      '"Public" can mean two different settings, so I check both:',
      '- **Public network access:** safe value is Disabled (private endpoint) or selected networks only.\n- **Anonymous blob access:** safe value is disabled at account level, containers set to `Private`.',
      'Then I identify what is exposed, disable anonymous access and public network access, add a private endpoint and private DNS for the apps that need it, review RBAC and SAS tokens / access keys (rotate keys if data may have leaked), check the Activity Log for who changed it and when, check storage logs for whether data was actually read anonymously, and prevent it with Azure Policy Deny plus a fix in the Terraform code.',
      'Disabling shared key access breaks apps that still use access keys or account SAS, so I move them to Entra ID (managed identity) first.',
    ],
    deeper: [
      'If the fix is only done in the portal, the next `terraform apply` from old code can open it again. The code must be fixed too.',
    ],
    code: [
      {
        title: 'Lock the account down',
        language: 'bash',
        code: `az storage account update \\
  -g rg-prod -n stappprod \\
  --public-network-access Disabled \\
  --allow-blob-public-access false \\
  --allow-shared-key-access false`,
      },
      {
        title: 'Response steps',
        language: 'text',
        code: `Identify what is exposed
-> disable anonymous access and public network access
-> private endpoint + private DNS for the apps that need it
-> review RBAC and SAS tokens / access keys (rotate keys if data may have leaked)
-> check Activity Log: who changed it and when
-> check storage logs: was data actually read anonymously?
-> prevent: Azure Policy Deny + fix the Terraform code`,
      },
      {
        title: 'Terraform',
        language: 'hcl',
        code: `public_network_access_enabled   = false
allow_nested_items_to_be_public = false
shared_access_key_enabled       = false`,
      },
    ],
    followUps: [
      'How would you prove whether any data was read while it was public?',
      'Which Azure Policy would stop this from happening again?',
    ],
    tags: ['security', 'storage', 'incident'],
  },
  {
    id: 'itv-myfaq-306',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A developer asks for Contributor. How do you restrict them instead?',
    probing:
      'Least privilege by role and scope, groups over users, custom roles when needed, and PIM for Production.',
    answer: [
      'I find out what the developer actually needs, then give the smallest role at the smallest scope.',
      '- **View only:** Reader.\n- **Manage web apps:** Website Contributor.\n- **Work with AKS:** Azure Kubernetes Service RBAC Writer (namespace scope).\n- **Read blob data:** Storage Blob Data Reader.\n- **Read Key Vault secrets:** Key Vault Secrets User.',
      'If no built-in role fits, I create a custom role.',
      '- Assign roles to Entra groups, not to individual users.\n- For Production, use Privileged Identity Management (PIM): the developer is eligible, requests access, gets approval, and the role expires automatically.\n- I created such custom roles with Bicep, so role assignments are reviewed in PRs like any other code.',
    ],
    code: [
      {
        title: 'Not this, but this',
        language: 'text',
        code: `Not this:  Developer -> Contributor -> whole subscription
This:      Entra group -> specific role -> one resource group or resource`,
      },
      {
        title: 'webapp-operator.json',
        language: 'json',
        code: `{
  "Name": "WebApp Operator",
  "IsCustom": true,
  "Actions": [
    "Microsoft.Web/sites/read",
    "Microsoft.Web/sites/restart/action"
  ],
  "AssignableScopes": ["/subscriptions/<sub-id>/resourceGroups/rg-dev"]
}`,
      },
      {
        title: 'Create the custom role',
        language: 'bash',
        code: `az role definition create --role-definition @webapp-operator.json`,
      },
    ],
    tags: ['rbac', 'least privilege', 'pim'],
  },
  {
    id: 'itv-myfaq-307',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Windows VM in Azure has too much or unauthorized access. How do you remediate it?',
    probing:
      'Checking every path into the VM - Azure RBAC, Entra login roles, local accounts, RDP - and using logs to see whether access was misused.',
    answer: [
      'I check every path into the VM: Azure RBAC, Entra login roles, local Windows accounts, and RDP.',
      '1. **RBAC:** remove broad roles. Virtual Machine Contributor can use Run Command, which means admin inside the OS, so treat it as privileged. Use PIM for admin access.\n2. **RDP:** never open 3389 to the internet. Use Azure Bastion (no public IP needed) and Just-in-time VM access in Defender for Cloud.\n3. **Local accounts:** review and clean up.\n4. **Credentials:** reset the local admin password (`az vm user update`) or manage it with Windows LAPS, and rotate service account passwords.\n5. **Logs:** Activity Log (RBAC, NSG, Run Command changes), Entra sign-in logs, and Windows Security events 4624 (logon, type 10 = RDP), 4625 (failed logon), 4720 and 4732 (account created, added to a group).',
      'Remember: first find out whether the access was misused, then lock it down, then prevent it with Policy and NSG rules in code.',
    ],
    deeper: [
      'Virtual Machine Contributor looks harmless but Run Command gives code execution as admin inside the OS, so I treat it as a privileged role.',
    ],
    code: [
      {
        title: 'Who has access to the VM',
        language: 'bash',
        code: `az role assignment list --scope <vm-resource-id> --include-inherited -o table`,
      },
      {
        title: 'Clean up local administrators',
        language: 'powershell',
        code: `Get-LocalGroupMember Administrators
Remove-LocalGroupMember -Group "Administrators" -Member "<user>"
Disable-LocalUser -Name "<user>"`,
      },
    ],
    followUps: [
      'How does Just-in-time VM access work?',
      'Which Windows event IDs would show an RDP logon or a new local admin?',
    ],
    tags: ['security', 'vm', 'windows', 'rbac'],
  },
  {
    id: 'itv-myfaq-308',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are local accounts in Kubernetes and AKS, and why do you disable them?',
    probing:
      'Understanding that a static cluster-admin kubeconfig cannot be tied to a person, and replacing it with Entra ID and RBAC.',
    answer: [
      'A local account is a user the cluster trusts directly, usually through a client certificate in a kubeconfig, not through an identity provider. In AKS, local accounts give a static cluster-admin kubeconfig (`az aks get-credentials --admin`). It cannot be tied to one person, has no MFA, and is hard to audit.',
      'I disable local accounts and use Microsoft Entra ID with Kubernetes RBAC or Azure RBAC for Kubernetes. Then a developer gets namespace access through an Entra group.',
    ],
    deeper: [
      '`--disable-local-accounts` needs Entra ID integration enabled first. After it, `--admin` credentials stop working.',
      'Users sign in through `kubelogin`. Pipelines use a service connection or workload identity.',
      'Keep an emergency (break-glass) Entra group for cluster admin.',
    ],
    code: [
      {
        title: 'Disable local accounts',
        language: 'bash',
        code: `az aks update -g my-rg -n my-aks \\
  --enable-aad \\
  --enable-azure-rbac \\
  --disable-local-accounts`,
      },
      {
        title: 'Namespace access through an Entra group',
        language: 'yaml',
        code: `kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: dev-team-view
  namespace: dev
subjects:
  - kind: Group
    name: "<entra-group-object-id>"
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: view
  apiGroup: rbac.authorization.k8s.io`,
      },
    ],
    tags: ['aks', 'security', 'rbac', 'entra id'],
  },
  {
    id: 'itv-myfaq-309',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you restrict users before requests reach the application?',
    probing:
      'Combining network restriction (WAF, locked backend) with identity restriction (Easy Auth, assignment, Conditional Access).',
    answer: [
      'I combine network restriction and identity restriction.',
      '- **WAF:** blocks SQL injection, XSS, bad bots, and floods. It does not know who the user is.\n- **Lock the backend:** allow only the Application Gateway subnet, or the `AzureFrontDoor.Backend` service tag plus the `X-Azure-FDID` header check. Otherwise users can bypass the WAF using `*.azurewebsites.net`.\n- **Easy Auth:** App Service Authentication with Microsoft Entra ID, "Require authentication". Unauthenticated requests never reach the code.\n- **Only one group:** in the Enterprise application, set "Assignment required = Yes" and assign only the allowed group.\n- **Conditional Access:** require MFA or a compliant device, block risky locations.',
      'Remember: WAF protects against bad traffic, Entra ID decides who is allowed. One does not replace the other.',
    ],
    deeper: [
      'If the backend is not locked to the gateway, the WAF is optional for an attacker: they call the `*.azurewebsites.net` address directly.',
    ],
    code: [
      {
        title: 'Request path with both kinds of restriction',
        language: 'text',
        code: `User
-> Front Door or Application Gateway + WAF  (OWASP rules, bots, rate limit, IP/geo rules)
-> App Service access restrictions or private endpoint (only the gateway can reach it)
-> App Service Authentication with Entra ID (not signed in -> redirect, not assigned -> denied)
-> application checks app roles`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Blocking users before the app',
        caption: 'WAF filters bad traffic; Entra ID decides who is allowed.',
        nodes: [
          { label: 'User' },
          { label: 'Front Door or App Gateway + WAF', detail: 'OWASP rules, bots, rate limit' },
          {
            label: 'Backend locked to the gateway',
            detail: 'access restrictions or private endpoint',
          },
          { label: 'Easy Auth with Entra ID', detail: 'not assigned -> denied', tone: 'accent' },
          { label: 'App checks app roles', tone: 'success' },
        ],
      },
    ],
    tags: ['security', 'waf', 'entra id', 'app service'],
  },
  {
    id: 'itv-myfaq-310',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'The frontend and backend both use HTTP. How do you move them to HTTPS?',
    probing:
      'An end-to-end plan: certificate in Key Vault, HTTPS listener and redirect, TLS policy, backend TLS, app and DNS-side changes, staged rollout.',
    answer: [
      '1. Get a certificate from a trusted CA (name in CN/SAN must match), store it in Key Vault.\n2. Add an HTTPS listener on Application Gateway that references the Key Vault certificate. Add an HTTP to HTTPS redirect rule.\n3. Set an SSL policy with TLS 1.2 minimum.\n4. For end-to-end TLS, set the backend settings to HTTPS and make the host name match the backend certificate.\n5. Change frontend API URLs to `https://` to avoid mixed-content errors. Mark cookies `Secure` and add the HSTS header.\n6. Update NSGs to allow 443, and update Entra redirect URIs to `https://`.\n7. Test in Dev and QA, then Production.',
      'For App Service: turn on "HTTPS Only" and set minimum TLS 1.2. For AKS ingress: cert-manager issues and renews the certificate, and the ingress redirects HTTP to HTTPS.',
      'Remember: Azure Load Balancer is Layer 4 and cannot terminate TLS. Use Application Gateway, Front Door, or the ingress controller. TLS termination at the gateway alone is not end-to-end encryption.',
    ],
    code: [
      {
        title: 'Target flow',
        language: 'text',
        code: `User -> HTTPS 443 -> Application Gateway (TLS cert from Key Vault, HTTP 80 redirects to 443)
     -> HTTPS -> frontend -> HTTPS -> backend API -> TLS -> database`,
      },
    ],
    tags: ['security', 'tls', 'https', 'application gateway'],
  },
  {
    id: 'itv-myfaq-311',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you make sure an expiring certificate does not break the application?',
    probing:
      'Monitor, auto-renew, make sure every binding picks up the renewal, and validate - not just renew in Key Vault.',
    answer: [
      'The certificate should never reach its expiry date. I follow: monitor -> renew -> deploy -> validate.',
      '- **Monitor:** keep an inventory, alert at 30, 15, and 7 days. Key Vault sends `CertificateNearExpiry` events to Event Grid, which I route to email, Teams, or a ticket.\n- **Auto-renew:** Key Vault lifetime action renews certificates from integrated CAs (DigiCert, GlobalSign) automatically. App Service managed certificates and cert-manager on AKS also renew themselves.\n- **Deploy:** Application Gateway referencing a versionless Key Vault secret picks up the renewed certificate automatically (it polls every 4 hours). A pinned version or a manually uploaded certificate must be updated.\n- **Validate:** check the served certificate dates with `openssl`.',
      'If it has already expired: renew, import, update the binding, validate, then do an RCA on why the alert was missed.',
    ],
    deeper: [
      'Renewing in Key Vault does not mean every service uses the new certificate. I check each binding.',
      'Public TLS certificate lifetimes are shrinking (200 days from March 2026, going down to 47 days by 2029), so manual renewal does not scale. Automation is required.',
    ],
    code: [
      {
        title: 'Validate the served certificate',
        language: 'bash',
        code: `openssl s_client -connect app.company.com:443 -servername app.company.com </dev/null \\
  | openssl x509 -noout -dates -subject`,
      },
    ],
    followUps: [
      'Why does a pinned certificate version on Application Gateway defeat auto-renewal?',
      'How would you build a certificate inventory across subscriptions?',
    ],
    tags: ['security', 'certificates', 'key vault', 'tls'],
  },
  {
    id: 'itv-myfaq-312',
    level: 'advanced',
    kind: 'open',
    prompt: 'How are containers isolated? What are namespaces and cgroups?',
    probing:
      'That a container is a process on a shared kernel, what namespaces and cgroups each do, and the extra hardening on top.',
    answer: [
      'A container is a normal Linux process with isolation from the kernel. It does not have its own OS kernel.',
      '- **Namespaces = what the process can see.**\n- **cgroups = how much it can use.**',
      '**Namespaces** and what each one isolates:',
      '- **PID:** process tree (each container has its own PID 1).\n- **NET:** IP address, routes, ports.\n- **MNT:** filesystem mounts.\n- **UTS:** hostname.\n- **IPC:** shared memory.\n- **USER:** maps root in the container to a normal user on the host.',
      'cgroups limit CPU, memory, disk I/O, and number of processes. In Kubernetes, `resources.limits` become cgroup limits. Over the memory limit -> `OOMKilled`. Over the CPU limit -> throttled.',
      '**Extra hardening on top:**',
      '- Drop Linux capabilities, `runAsNonRoot`, `allowPrivilegeEscalation: false`, read-only root filesystem.\n- Seccomp `RuntimeDefault` and AppArmor or SELinux to limit system calls and file access.\n- Pod Security Admission (Restricted), NetworkPolicies, RBAC.\n- For untrusted workloads, stronger isolation with a separate kernel: AKS Pod Sandboxing (Kata Containers).',
    ],
    deeper: [
      'All containers on a node share one kernel. A privileged container or a kernel bug can break isolation, so I never run privileged containers without a strong reason.',
    ],
    code: [
      {
        title: 'cgroup limits from docker run',
        language: 'bash',
        code: `docker run --memory=512m --cpus=1 nginx`,
      },
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'Containers share one kernel',
        caption: 'Namespaces limit what a container sees; cgroups limit what it uses.',
        root: {
          label: 'Node (one Linux kernel)',
          children: [
            {
              label: 'Container A',
              detail: 'own PID, NET, MNT namespaces; cgroup limits',
            },
            {
              label: 'Container B',
              detail: 'own PID, NET, MNT namespaces; cgroup limits',
            },
          ],
        },
      },
    ],
    tags: ['containers', 'security', 'linux', 'kubernetes'],
  },
  {
    id: 'itv-myfaq-313',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does AKS connect to Key Vault without storing a client secret?',
    probing:
      'The Workload Identity token exchange end to end, and the one-time setup: OIDC issuer, federated credential, least-privilege role.',
    answer: [
      "No client secret is stored in the cluster. The Pod's Kubernetes token is exchanged for an Entra ID token.",
      'The Pod runs with the `orders-api` ServiceAccount. Its Kubernetes ServiceAccount token is issued by the AKS OIDC issuer, Entra ID checks the federated credential, issues a token for the user-assigned managed identity, and that token reads Key Vault with the Key Vault Secrets User role.',
      'One-time setup: turn on the OIDC issuer, Workload Identity and the Key Vault CSI add-on; create the identity and trust the Kubernetes ServiceAccount with a federated credential; then give least-privilege access on one vault only.',
    ],
    deeper: [
      'AAD Pod Identity is deprecated. Use Workload Identity.',
      'The `--subject` must match the namespace and ServiceAccount name exactly, or the token exchange fails.',
      'If the vault is private, AKS needs the private endpoint and the `privatelink.vaultcore.azure.net` DNS zone linked to its VNet.',
    ],
    code: [
      {
        title: 'Token exchange',
        language: 'text',
        code: `Pod (ServiceAccount orders-api)
-> Kubernetes ServiceAccount token
-> AKS OIDC issuer
-> Entra ID checks the federated credential
-> token for the user-assigned managed identity
-> Key Vault (role: Key Vault Secrets User)`,
      },
      {
        title: 'One-time setup',
        language: 'bash',
        code: `# 1. Turn on OIDC issuer, Workload Identity and the Key Vault CSI add-on
az aks update -g my-rg -n my-aks --enable-oidc-issuer --enable-workload-identity
az aks enable-addons -g my-rg -n my-aks --addons azure-keyvault-secrets-provider

# 2. Create the identity and trust the Kubernetes ServiceAccount
az identity create -g my-rg -n id-orders-api
OIDC_ISSUER=$(az aks show -g my-rg -n my-aks --query oidcIssuerProfile.issuerUrl -o tsv)
az identity federated-credential create \\
  --name orders-api-fic \\
  --identity-name id-orders-api \\
  --resource-group my-rg \\
  --issuer "$OIDC_ISSUER" \\
  --subject system:serviceaccount:production:orders-api \\
  --audience api://AzureADTokenExchange

# 3. Least-privilege access on one vault only
az role assignment create \\
  --role "Key Vault Secrets User" \\
  --assignee <identity-client-id> \\
  --scope <key-vault-resource-id>`,
      },
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Workload Identity token exchange',
        caption: 'No secret in the cluster: a Kubernetes token is traded for an Entra ID token.',
        participants: [
          { id: 'pod', label: 'Pod' },
          { id: 'entra', label: 'Entra ID' },
          { id: 'kv', label: 'Key Vault' },
        ],
        messages: [
          {
            from: 'pod',
            to: 'entra',
            label: 'ServiceAccount token, checked against federated credential',
          },
          { from: 'entra', to: 'pod', label: 'managed identity token', kind: 'return' },
          { from: 'pod', to: 'kv', label: 'read secret with token' },
          { from: 'kv', to: 'pod', label: 'secret value', kind: 'return' },
        ],
      },
    ],
    tags: ['secrets', 'workload identity', 'aks', 'key vault'],
  },
  {
    id: 'itv-myfaq-314',
    level: 'advanced',
    kind: 'open',
    prompt: 'You update a Kubernetes Secret. Do the running Pods see the new value?',
    probing:
      'That the answer depends on how the Secret is consumed: env var, volume, subPath, baked into image, or CSI with rotation.',
    answer: [
      'It depends on how the Pod consumes the Secret.',
      '- **Environment variable (`secretKeyRef`):** no change. The Pod keeps the old value until it restarts.\n- **Volume mount:** the file is updated after a short delay (kubelet sync, usually under a minute or two).\n- **Volume mount with `subPath`:** not updated. Needs a restart.\n- **Baked into the image (`ENV` in Dockerfile):** no effect at all. Rebuild the image. This is also a security problem.\n- **Key Vault CSI driver with rotation enabled:** mounted file is refreshed on the poll interval (default 2 minutes). Synced env vars still need a restart.',
      'For an env var, the old value stays until I run `kubectl rollout restart`. For a volume, the file is updated but the app must re-read the file.',
    ],
    deeper: [
      'Even when the file changes, an application that read the value only at startup keeps the old one in memory.',
      'Some teams use a controller such as Stakater Reloader to roll the Deployment automatically when a Secret changes.',
      'Enable CSI rotation with `az aks addon update -g my-rg -n my-aks --addon azure-keyvault-secrets-provider --enable-secret-rotation`.',
    ],
    code: [
      {
        title: 'What happens after the change',
        language: 'text',
        code: `Secret changed
-> env var: old value stays -> kubectl rollout restart -> new value
-> volume:  file updated     -> app must re-read the file`,
      },
      {
        title: 'Roll the Deployment to pick up the new value',
        language: 'bash',
        code: `kubectl rollout restart deployment orders-api -n production
kubectl rollout status deployment orders-api -n production`,
      },
    ],
    tags: ['secrets', 'kubernetes', 'rotation'],
  },
  {
    id: 'itv-myfaq-315',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you keep secrets out of container images?',
    probing:
      'Knowing that every layer and build arg is readable, using BuildKit secret mounts for build-time needs, and injecting at runtime.',
    answer: [
      'I never put a secret inside an image. Anyone who can pull the image can read every layer. The image contains only the application, and secrets are injected at runtime.',
      'I avoid `ENV` secrets, copying `.env` files, and `--build-arg` passwords. Build arguments and `ENV` values can be seen with `docker history` and image metadata.',
      'If the build itself needs a secret (for example, a private package feed token), I use a BuildKit secret mount. It is available only during that `RUN` step and is not saved in a layer.',
      '- Add `.env` and key files to `.dockerignore` and `.gitignore`.\n- Scan the repository with Gitleaks and the image with `trivy image --scanners vuln,secret`.\n- If a secret was baked into a pushed image, rotate the secret, rebuild the image, and delete the old image tags from ACR. Removing the line from the Dockerfile is not enough.',
    ],
    code: [
      {
        title: 'What I avoid',
        language: 'dockerfile',
        code: `ENV DB_PASSWORD=<hardcoded-password>
COPY .env /app/.env`,
      },
      {
        title: 'Also avoided: a secret as a build argument',
        language: 'bash',
        code: `docker build --build-arg DB_PASSWORD=<hardcoded-password> .`,
      },
      {
        title: 'BuildKit secret mount',
        language: 'dockerfile',
        code: `# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci`,
      },
      {
        title: 'Pass the secret at build time',
        language: 'bash',
        code: `docker build --secret id=npmrc,src=$HOME/.npmrc -t orders-api:1.4.0 .`,
      },
      {
        title: 'At runtime',
        language: 'text',
        code: `Image (no secrets) -> AKS Pod -> Workload Identity -> Key Vault -> secret as mounted file`,
      },
    ],
    tags: ['secrets', 'docker', 'containers'],
  },
  {
    id: 'itv-myfaq-316',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Your App Service or AKS application connects to Azure PostgreSQL. How do you store the connection string with Key Vault and Managed Identity?',
    probing:
      'Identity-based access to Key Vault, App Service Key Vault references, and ideally removing the database password with Entra authentication.',
    answer: [
      '1. Store the connection string as a secret, for example `postgres-connection-string`.\n2. Enable managed identity on the App Service, or Workload Identity on AKS.\n3. Give that identity **Key Vault Secrets User** on that vault only.\n4. Read it at runtime.',
      'On App Service, no code change is needed. I use a Key Vault reference in the app settings. A versionless reference picks up a new secret version automatically (App Service refreshes it within 24 hours, or on restart).',
      "**Follow-up: How do you remove the password completely?** Azure Database for PostgreSQL Flexible Server supports Microsoft Entra authentication. The application's managed identity is added as a database role and logs in with a token, so there is no database password to store or rotate. This is my preferred design for new applications.",
    ],
    deeper: [
      'With Entra authentication the app identity gets an Entra token for PostgreSQL and logs in as that identity, so there is nothing to rotate.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Application
-> managed identity (App Service) or Workload Identity (AKS)
-> Entra ID token
-> Key Vault (Key Vault Secrets User on this vault)
-> connection string
-> PostgreSQL over a private endpoint`,
      },
      {
        title: 'App Service Key Vault reference',
        language: 'text',
        code: `DB_CONNECTION = @Microsoft.KeyVault(SecretUri=https://kv-project-production.vault.azure.net/secrets/postgres-connection-string/)`,
      },
      {
        title: 'Passwordless',
        language: 'text',
        code: `App identity -> Entra token for PostgreSQL -> database login as that identity`,
      },
    ],
    followUps: [
      'How quickly does App Service pick up a new secret version?',
      'How do you add a managed identity as a PostgreSQL role?',
    ],
    tags: ['secrets', 'key vault', 'managed identity', 'postgresql'],
  },
  {
    id: 'itv-myfaq-317',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage credentials in Azure DevOps?',
    probing:
      'Choosing the right store for each need (secret variables, Key Vault-linked groups, workload identity federation, Secure Files) and knowing how masking really works.',
    answer: [
      '- **Simple secret value:** secret pipeline variable (masked, cannot be viewed after saving).\n- **Shared or Production secrets:** variable group linked to Key Vault, or the `AzureKeyVault@2` task.\n- **Access to Azure, ACR, AKS:** service connection with workload identity federation (no stored client secret).\n- **Files such as a certificate or kubeconfig:** Secure Files library with `DownloadSecureFile@1`.',
      'Secret variables are not passed to scripts as environment variables automatically. I map them with `env:` only in the step that needs them.',
      'I do not `echo` secrets. Masking works only for exact known values, so encoded or split values can still leak.',
      "The service connection's identity gets least-privilege RBAC, and the Production service connection has approvals and checks.",
    ],
    code: [
      {
        title: 'Key Vault secrets in a pipeline',
        language: 'yaml',
        code: `variables:
  - group: prod-keyvault-secrets   # linked to Key Vault

steps:
  - task: AzureKeyVault@2
    inputs:
      azureSubscription: prod-service-connection
      KeyVaultName: kv-project-production
      SecretsFilter: 'DB-PASSWORD'

  - script: ./run-migration.sh
    env:
      DB_PASSWORD: $(DB-PASSWORD)   # secrets are not exposed to scripts unless mapped`,
      },
    ],
    tags: ['secrets', 'azure devops', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-318',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you store secrets in Jenkins?',
    probing:
      'Credentials store referenced by ID, safe quoting in sh steps, scoping, and managed identity to avoid storing Azure secrets at all.',
    answer: [
      'I store them in the Jenkins Credentials store (Manage Jenkins -> Credentials) and reference them by ID. For Production on Azure, I prefer Key Vault as the source.',
      "- Use single quotes in `sh '...'` so the shell reads the variable. With double quotes, Groovy puts the secret into the command string and Jenkins warns about it.\n- Do not use `set -x` or `echo` around secret commands.\n- Never put secrets in the `environment {}` block as plain text.\n- If the agent runs on an Azure VM, it can use the VM's managed identity (`az login --identity`) and read Key Vault, so no Azure client secret is stored in Jenkins at all.\n- Restrict credentials with folder-level scope so one team's job cannot use another team's Production credential.",
    ],
    code: [
      {
        title: 'withCredentials (Groovy)',
        language: 'text',
        code: `withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
    sh 'mvn sonar:sonar -Dsonar.token="$SONAR_TOKEN"'
}`,
      },
    ],
    tags: ['secrets', 'jenkins', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-319',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure your Terraform state file?',
    probing:
      'Remote backend with Entra ID auth, network restriction, versioning, locking, per-environment state, and knowing what sensitive = true does not do.',
    answer: [
      'State is never local and never in Git. I use an Azure Storage Account backend with Entra ID authentication instead of storage account keys.',
      '- **Entra ID + RBAC (`Storage Blob Data Contributor` only for the pipeline identity):** no shared access keys.\n- **Private endpoint or firewall, public access off:** only the build agents can reach it.\n- **Blob versioning and soft delete:** recover a corrupted or deleted state.\n- **State locking (blob lease, automatic with `azurerm`):** stops two applies at the same time.\n- **Separate state per environment:** a Dev mistake cannot touch Production state.\n- **`*.tfstate` and `*.tfstate.backup` in `.gitignore`:** never committed.',
    ],
    deeper: [
      '`sensitive = true` only hides the value in plan output. It is still saved in the state file.',
      'Newer Terraform (1.10+) has ephemeral values, and 1.11+ has write-only arguments (for example `value_wo` on `azurerm_key_vault_secret`), which keep a value out of state when the provider supports it.',
      'Nobody edits state by hand. I use `terraform state mv` or `import` blocks.',
    ],
    code: [
      {
        title: 'azurerm backend with Entra ID auth',
        language: 'hcl',
        code: `terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstateprod"
    container_name       = "tfstate"
    key                  = "prod/network.tfstate"
    use_azuread_auth     = true
  }
}`,
      },
    ],
    tags: ['terraform', 'state', 'security'],
  },
  {
    id: 'itv-myfaq-320',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Will there be downtime when you rotate secrets in Key Vault?',
    probing:
      'That a new Key Vault version is harmless; the risk is how the app picks it up and revoking the old credential too early.',
    answer: [
      'No. Adding a new secret version in Key Vault does not cause downtime by itself. The risk is in how the application picks up the new value and when the old credential stops working.',
      '- If the app reads the secret at runtime, or re-reads the mounted file, no restart is needed.\n- If it reads the secret only at startup, I do a rolling restart. With several replicas and a PodDisruptionBudget, traffic keeps flowing.\n- I use the two-credential pattern where possible: Storage Accounts have `key1` and `key2`, and for a database I can keep two users or let the old password stay valid until all Pods use the new one.',
    ],
    deeper: [
      'Downtime happens when the old credential is revoked before every Pod has the new one.',
    ],
    code: [
      {
        title: 'Rotation without downtime',
        language: 'text',
        code: `1. Create the new credential (old one still valid)
2. Store it as a new Key Vault version
3. Application picks it up (refresh, or rolling restart)
4. Validate the application
5. Disable the old credential`,
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Zero-downtime secret rotation',
        caption: 'Revoke the old credential only after every Pod uses the new one.',
        nodes: [
          { label: 'Create new credential', detail: 'old one still valid' },
          { label: 'New Key Vault version' },
          { label: 'App picks it up', detail: 'refresh or rolling restart' },
          { label: 'Validate the application', tone: 'success' },
          { label: 'Disable old credential', tone: 'warning' },
        ],
      },
    ],
    tags: ['secrets', 'rotation', 'key vault'],
  },
]
