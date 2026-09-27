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
      '`kubectl auth can-i` helps verify whether a ServiceAccount has secret access.',
    ],
    code: [
      {
        title: 'Check whether a ServiceAccount can read Secrets',
        language: 'bash',
        code: `kubectl auth can-i get secrets \\
  --as=system:serviceaccount:production:orders-api \\
  -n production`,
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
]
