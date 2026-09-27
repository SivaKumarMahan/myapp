import type { InterviewQuestion } from '../../../types'

/** Secrets, credentials and image scanning from the Deloitte rounds. */
export const roundsDeloitteSecurityQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rdel-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Identify every security problem in this pipeline snippet',
    promptCode: [
      {
        title: 'Given',
        language: 'yaml',
        code: `env:
  - name: DB_PASSWORD
    value: "<db-password>"

variables:
  azureSubscription: "prod-subscription"`,
      },
    ],
    probing:
      'Whether you spot the hardcoded production password and its Git-history exposure, and also know what is not a secret.',
    answer: [
      'There are several security problems here. The biggest one is the database password is hardcoded in plain text. **Security issues**:',
      '- **1. Hardcoded DB password**: Why it is dangerous: Anyone with access to the YAML/repository can see it; Better approach: Azure Key Vault / Kubernetes Secret\n- **2. Production credential in source control**: Why it is dangerous: Git history can retain the password even after deleting it; Better approach: Store secrets outside Git\n- **3. Password passed as an environment variable**: Why it is dangerous: Environment variables can potentially be exposed through debugging, logs, process inspection, or application dumps; Better approach: Use a secret mechanism such as Key Vault or Kubernetes Secrets\n- **4. Password is not marked secret**: Why it is dangerous: Azure DevOps treats normal variables differently from secret variables; Better approach: Use secret variables or, preferably, Key Vault\n- **5. No secret rotation mechanism**: Why it is dangerous: Hardcoded credentials tend to remain unchanged for long periods; Better approach: Use managed identity/Key Vault rotation\n- **6. Production subscription identifier exposed**: Why it is dangerous: Not a password, but unnecessarily exposing environment/infrastructure information can help attackers; Better approach: Use a properly secured service connection\n- **7. Potential privilege issue with service connection**: Why it is dangerous: If `azureSubscription` has excessive permissions, compromise of the pipeline can become an Azure compromise; Better approach: Apply least privilege/RBAC\n- **8. No separation of application and deployment secrets**: Why it is dangerous: Application credentials and Azure authentication are being handled as ordinary configuration; Better approach: Use Key Vault + service connections/managed identities',
      '**Best solution** - For an Azure + AKS environment, I would avoid putting the password in YAML completely.',
      'A better architecture is: (see code below)',
      'For example, Azure DevOps can retrieve the secret from Key Vault: (see code below)',
      'Then the pipeline uses the secret without putting the actual password into the YAML.',
      'For AKS, an even better production design is to use Azure Key Vault + Secrets Store CSI Driver / Workload Identity, so the application can retrieve the secret without storing the actual password in the Git repository or pipeline YAML.',
      '**One important correction**',
      '`azureSubscription: "prod-subscription"` is not itself a secret. The security problem isn\'t that the subscription name appears in YAML.',
      'The real concern is what service connection it refers to and what permissions that identity has.',
      '**Interview answer** - "The primary security issue is the hardcoded production database password. It can be exposed through source control and Git history. I would move it to Azure Key Vault and access it using a secured Azure DevOps service connection or managed identity. I would also ensure the service connection follows least-privilege RBAC. I would avoid passing production credentials as normal environment variables and implement secret rotation. The subscription name itself isn\'t a secret, but the identity behind the service connection must be properly secured."',
    ],
    code: [
      {
        title: 'A better architecture is',
        language: 'text',
        code: `Azure DevOps Pipeline
        |
        | Managed Identity / Service Connection
        v
   Azure Key Vault
        |
        | DB password
        v
       AKS
        |
        v
   Spring Boot
        |
        v
Azure PostgreSQL`,
      },
      {
        title: 'For example, Azure DevOps can retrieve the secret from Key Vault',
        language: 'yaml',
        code: `- task: AzureKeyVault@2
  inputs:
    azureSubscription: 'prod-subscription'
    KeyVaultName: 'prod-keyvault'
    SecretsFilter: 'DB-PASSWORD'`,
      },
    ],
    tags: ['security', 'secrets', 'azure devops'],
  },
  {
    id: 'itv-rdel-26',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure secrets in container images?',
    probing:
      'Whether you keep secrets out of images and build args entirely and inject them at runtime from a secret manager.',
    answer: [
      'The key rule is: never put secrets inside the Docker image.',
      "**Don't hardcode secrets in the Dockerfile** (see code below)",
      "**Don't pass secrets during docker build**",
      'Avoid: `docker build --build-arg DB_PASSWORD=<db-password> .`',
      'Build arguments can potentially become visible in image history or build metadata.',
      '**Inject secrets at runtime**',
      'The image should contain only the application.',
      '**Use a secret manager**',
      'In Azure, I would typically use Azure Key Vault.',
      '**For AKS, use Workload Identity + Key Vault**',
      'The Pod gets an Azure identity through Microsoft Entra Workload ID, and the application retrieves the required secret from Key Vault.',
      'This is better than putting the secret directly in: (see code below)',
      '**If Kubernetes Secrets are used, protect them properly**',
      'Kubernetes Secrets are better than plain-text environment variables, but they are not automatically equivalent to a full secret-management solution. Enable encryption at rest and restrict RBAC access.',
      '**Scan images and repositories**',
      'I would use tools such as Trivy, GitLeaks, or similar scanners to detect accidentally committed credentials.',
      '**Rotate compromised secrets**',
      "If a password is accidentally committed or baked into an image, don't just delete the line. Rotate/revoke the credential, rebuild the image, and remove the compromised credential from wherever it was exposed.",
      '**Interview answer** - "I never store secrets inside a container image. I keep the Docker image immutable and free of credentials, and inject secrets at runtime. In Azure and AKS, I prefer Azure Key Vault with Workload Identity and the Secrets Store CSI Driver. I also avoid Docker build arguments for sensitive values, scan the repository and images for leaked secrets, apply least-privilege RBAC, and rotate any credential that gets exposed."',
    ],
    code: [
      {
        title: "Don't hardcode secrets in the Dockerfile - Avoid",
        language: 'dockerfile',
        code: `ENV DB_PASSWORD=<db-password>`,
      },
      {
        title: "Don't hardcode secrets in the Dockerfile - Also avoid",
        language: 'dockerfile',
        code: `COPY .env /app/.env`,
      },
      {
        title: "Don't pass secrets during docker build - commands",
        language: 'bash',
        code: `docker build --build-arg DB_PASSWORD=<db-password> .`,
      },
      {
        title: 'Inject secrets at runtime',
        language: 'text',
        code: `Docker Image
    |
    | no passwords
    v
Container
    |
    +---- DB username/password injected at runtime`,
      },
      {
        title: 'Use a secret manager',
        language: 'text',
        code: `Azure DevOps
     |
     v
Azure Key Vault
     |
     v
    AKS
     |
     v
Application Pod
     |
     v
PostgreSQL`,
      },
      {
        title: 'This is better than putting the secret directly in',
        language: 'yaml',
        code: `env:
  - name: DB_PASSWORD
    value: "<db-password>"`,
      },
    ],
    tags: ['docker', 'secrets', 'security'],
  },
  {
    id: 'itv-rdel-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage credentials in Azure DevOps?',
    probing:
      'Whether you know secret variables, Key Vault-linked variable groups, service connections and secure files - and what to avoid.',
    answer: [
      "I keep credentials out of YAML entirely and rely on Azure DevOps's built-in secret handling.",
      '**1. Secret pipeline variables** (see code below)',
      "`DB_PASSWORD` is defined in the pipeline UI (or a variable group) and marked as **secret**. Azure DevOps automatically masks it in logs, and it can't be viewed again once saved — only replaced.",
      '**2. Variable groups linked to Azure Key Vault**',
      'Instead of storing secrets directly in Azure DevOps, I link a variable group to an Azure Key Vault: (see code below)',
      "The pipeline references the variable group, and the actual secret value never has to be typed into Azure DevOps directly — it's fetched from Key Vault at run time.",
      '**3. Service connections instead of hardcoded credentials**',
      'For connecting to Azure, ACR, AKS, etc., I use a **service connection** (ideally backed by a managed identity or workload identity federation) rather than a stored username/password.',
      '**4. Secure files** - For things like a `kubeconfig` or a certificate, I use the **Secure Files** library instead of committing them to the repo. **What I avoid**:',
      "- Printing secret variables with `echo $(secretVar)` — Azure DevOps masks known secret variables in logs, but it's still a bad habit and can leak through unusual formatting.\n- Storing secrets as plain (non-secret) variables.\n- Granting a service connection more permissions (RBAC) than the pipeline actually needs.",
      '**Interview answer** - "I avoid putting credentials directly in YAML. For simple cases, I use secret pipeline variables, which Azure DevOps masks in logs. For shared or production secrets, I use variable groups linked to Azure Key Vault, so the actual value is fetched at runtime rather than stored in Azure DevOps. For connecting to Azure resources, I use service connections backed by managed identity or workload identity instead of stored credentials, and I make sure those connections follow least-privilege RBAC. Certificates or config files are handled through the Secure Files library rather than being committed to the repository."',
    ],
    code: [
      {
        title: 'Secret pipeline variables',
        language: 'yaml',
        code: `variables:
  - name: dbPassword
    value: $(DB_PASSWORD)`,
      },
      {
        title: 'Variable groups linked to Azure Key Vault',
        language: 'text',
        code: `Azure DevOps Library
      |
      v
Variable Group (linked to Key Vault)
      |
      v
   Azure Key Vault
      |
      +--> DB-PASSWORD
      +--> API-KEY`,
      },
      {
        title: 'Variable groups linked to Azure Key Vault (2)',
        language: 'yaml',
        code: `variables:
- group: 'prod-secrets'   # linked to Key Vault

steps:
- script: echo "Using secret without printing it"
  env:
    DB_PASSWORD: $(DB-PASSWORD)`,
      },
      {
        title: 'Service connections instead of hardcoded credentials',
        language: 'yaml',
        code: `- task: AzureCLI@2
  inputs:
    azureSubscription: 'Prod-Service-Connection'
    scriptType: bash
    inlineScript: |
      az account show`,
      },
    ],
    tags: ['azure devops', 'secrets', 'key vault'],
  },
  {
    id: 'itv-rdel-28',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain in detail how Trivy is used to scan container images',
    probing:
      'Whether you use Trivy as a real gate - severity, exit code, scan before push, reports - and handle unfixable CVEs through a process, not an ignore file.',
    answer: [
      'For a DevOps interview, you should understand what Trivy scans, where it runs in the pipeline, what the output means, and what happens when vulnerabilities are found.',
      '**1. What is Trivy?**',
      'Trivy is an open-source security scanner commonly used in CI/CD pipelines. It can scan:',
      '- Container images\n- Filesystems\n- Git repositories\n- Kubernetes configurations\n- Infrastructure-as-Code files\n- Dependencies\n- Secrets and misconfigurations',
      'For container images, the main purpose is to identify known vulnerabilities in OS packages and application dependencies.',
      'For example, your image may be: (see code below)',
      'Trivy examines these components and compares vulnerable package versions against vulnerability databases.',
      '**2. Where does Trivy fit in CI/CD?**',
      'For your Azure DevOps pipeline, I would use: (see code below)',
      'The important point is: scan the image before pushing/deploying it.',
      '**3. Build the Docker image**',
      'Suppose your Dockerfile is: (see code below)',
      'Build the image: `docker build -t payment-api:25 .`',
      'Now you have `payment-api:25`.',
      '**4. Run a basic Trivy scan**',
      '`trivy image payment-api:25`',
      'Trivy analyzes the image and reports something like: (see code below)',
      'The exact output depends on the image and current vulnerability database.',
      '**5. Scan only HIGH and CRITICAL**',
      "In CI/CD, you normally don't want every low-severity issue to immediately stop the pipeline. `trivy image --severity HIGH,CRITICAL payment-api:25`",
      'This tells Trivy: show me HIGH and CRITICAL vulnerabilities.',
      '**6. Make the pipeline fail**',
      'This is one of the most important options for interviews. `trivy image --severity HIGH,CRITICAL --exit-code 1 payment-api:25`',
      '`--exit-code 1` means: if vulnerabilities matching the selected severity are found, return exit code 1.',
      'So the pipeline behaves like: (see code below)',
      '**7. Why is exit-code important?**',
      'Consider: `trivy image --severity HIGH,CRITICAL payment-api:25`',
      'Trivy may print: `3 HIGH`, `1 CRITICAL`',
      "But the pipeline might continue unless you configure the command to fail based on the findings. That's why `--exit-code 1` is useful.",
      '**8. Example Azure DevOps stage** (see code below)',
      'If Trivy finds HIGH or CRITICAL vulnerabilities, the stage fails.',
      '**9. Installing Trivy in Azure DevOps**',
      'One simple approach is to install it in the pipeline: (see code below)',
      'In a production environment, you can also use a prebuilt agent/container image containing Trivy instead of installing it on every run.',
      '**10. Scanning the image before ACR push**',
      'Suppose your pipeline does: (see code below)',
      '`docker build -t payment-api:125 .`, `trivy image --severity HIGH,CRITICAL --exit-code 1 payment-api:125`',
      'If successful: `docker tag payment-api:125 myacr.azurecr.io/payment-api:125`, `docker push myacr.azurecr.io/payment-api:125`',
      'This prevents vulnerable images from reaching ACR.',
      '**11. Can Trivy scan an image already in ACR?**',
      'Yes. You can authenticate to ACR and scan the image: `trivy image myacr.azurecr.io/payment-api:125`',
      'For example, ACR could hold `payment-api:123`, `payment-api:124`, `payment-api:125`.',
      "However, I generally prefer: `Build -> Scan -> Push -> Deploy` rather than: `Build -> Push -> Scan -> Deploy` because you don't want to push an image that has already failed your security gate.",
      '**12. Trivy and application dependencies**',
      "Trivy isn't limited to OS packages. Depending on the image and ecosystem, it can detect vulnerabilities in application dependencies too.",
      'For example, your Spring Boot application might contain Spring Framework, Jackson, Logback, Netty, Tomcat, and other Maven dependencies — a vulnerable dependency could be detected there as well.',
      'So your image could have an OS vulnerability, a Java dependency vulnerability, and an application/library vulnerability simultaneously. This is why container scanning is useful even when the application itself builds successfully.',
      '**13. Trivy severity levels**',
      'The common severity levels are: `UNKNOWN`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.',
      'A typical company policy might be:',
      '- **CRITICAL**: Block deployment\n- **HIGH**: Block deployment\n- **MEDIUM**: Report / review\n- **LOW**: Monitor',
      "But this should be based on your organization's security policy. Don't blindly say \"every vulnerability must fail the pipeline\" — that can create unnecessary pipeline failures, especially when there is no available fix or the vulnerability isn't exploitable in your application's context.",
      '**14. What if a vulnerability has no fix?**',
      'Trivy may show something like: (see code below)',
      "That means there is currently no known fixed package version available in the vulnerability data. You shouldn't simply ignore it — you should investigate:",
      '- Is the vulnerable package actually used?\n- Is the vulnerable functionality reachable?\n- Is there a newer base image?\n- Can the dependency be upgraded?\n- Is the package required?\n- Is there a vendor mitigation?\n- Does your security policy allow a documented exception?',
      '**15. Use an allowlist carefully**',
      'Sometimes organizations need to accept a known vulnerability temporarily. Trivy supports ignore files, e.g. `.trivyignore`, which can contain vulnerability IDs that have been reviewed and approved.',
      'Bad practice — an undocumented `.trivyignore`: `CVE-xxxxx`, `CVE-yyyyy`, `CVE-zzzzz`',
      'A proper exception should have: vulnerability, reason, risk assessment, owner, approval, and an expiration/review date.',
      '**16. Generate a report**',
      'You can produce machine-readable output: `trivy image --format json --output trivy-report.json payment-api:25`',
      'You can also generate other formats depending on your reporting requirements. This is useful for feeding console output, a JSON report, and a security dashboard.',
      '**17. Trivy can also scan for secrets** - `trivy fs .`',
      'This can scan the filesystem, and Trivy can identify potential secrets depending on the configured scanners. But I would not rely only on Trivy for secret detection — tools such as GitLeaks are also commonly used.',
      '**18. Trivy vs SonarQube**',
      'This is a common interview question. They solve different problems.',
      '- **SonarQube**: Source-code quality and code-level security analysis\n- **Trivy**: Container/image vulnerabilities, dependencies, misconfigurations, secrets\n- **Checkov**: IaC security\n- **GitLeaks**: Secret detection\n- **OWASP Dependency-Check**: Dependency vulnerability scanning',
      'Your pipeline could therefore be: (see code below)',
      '**19. Complete example for a React + Spring Boot application**',
      'For an application with React, Spring Boot, AKS, and ACR, I would structure the security part like this: (see code below)',
      '**20. Strong interview answer**',
      'If the interviewer asks "How do you use Trivy to scan container images?", say:',
      '"After building the Docker image, I run Trivy against the local image before pushing it to ACR. I normally configure the scan to check HIGH and CRITICAL vulnerabilities and use `--exit-code 1` so the pipeline fails if those vulnerabilities are detected. I also generate a report for security tracking. If vulnerabilities are found, I check whether a fixed version is available and upgrade the base image or application dependency. If there is no fix, I assess the risk and follow the organization\'s exception process instead of blindly ignoring it. Only after the security gate passes do I push the image to ACR and deploy it to AKS."',
      'The command to remember: `trivy image --severity HIGH,CRITICAL --exit-code 1 payment-api:25`',
      'The key interview flow is: Build → Scan → Fail/Pass → Push → Deploy.',
    ],
    code: [
      {
        title: 'For example, your image may be',
        language: 'text',
        code: `payment-api:v25
       |
       +-- Ubuntu/Debian packages
       +-- Java runtime
       +-- Spring Boot dependencies
       +-- Application libraries`,
      },
      {
        title: 'For your Azure DevOps pipeline, I would use',
        language: 'text',
        code: `Developer
    |
    v
Git
    |
    v
Build
    |
    v
Unit Tests
    |
    v
SonarQube
    |
    v
Docker Build
    |
    v
Trivy Image Scan
    |
    +---- Vulnerability found ---> Pipeline FAIL
    |
    v
Push to ACR
    |
    v
Deploy to AKS`,
      },
      {
        title: 'Suppose your Dockerfile is',
        language: 'dockerfile',
        code: `FROM eclipse-temurin:17-jre

WORKDIR /app

COPY target/payment-api.jar app.jar

CMD ["java", "-jar", "app.jar"]`,
      },
      {
        title: 'Build the Docker image - commands',
        language: 'bash',
        code: `docker build -t payment-api:25 .`,
      },
      {
        title: 'Run a basic Trivy scan - commands',
        language: 'bash',
        code: `trivy image payment-api:25`,
      },
      {
        title: 'Trivy analyzes the image and reports something like',
        language: 'text',
        code: `payment-api:25

Total: 15 vulnerabilities

+------------+----------+----------------+--------------+
| Library    | Severity | Installed Ver. | Fixed Ver.   |
+------------+----------+----------------+--------------+
| libssl     | HIGH     | 3.0.x          | 3.0.x        |
| curl       | MEDIUM   | 7.x            | 7.x          |
| openssl    | CRITICAL | 3.0.x          | 3.0.x        |
+------------+----------+----------------+--------------+`,
      },
      {
        title: 'Scan only HIGH and CRITICAL - commands',
        language: 'bash',
        code: `trivy image \\
  --severity HIGH,CRITICAL \\
  payment-api:25`,
      },
      {
        title: 'Make the pipeline fail - commands',
        language: 'bash',
        code: `trivy image \\
  --severity HIGH,CRITICAL \\
  --exit-code 1 \\
  payment-api:25`,
      },
      {
        title: 'So the pipeline behaves like',
        language: 'text',
        code: `Trivy Scan
    |
    +---- No HIGH/CRITICAL
    |          |
    |          v
    |       Continue
    |
    +---- HIGH/CRITICAL found
               |
               v
          Exit code 1
               |
               v
          Pipeline fails`,
      },
      {
        title: 'Why is exit-code important? - commands',
        language: 'bash',
        code: `trivy image --severity HIGH,CRITICAL payment-api:25`,
      },
      {
        title: 'Why is exit-code important? - snippet',
        language: 'text',
        code: `3 HIGH
1 CRITICAL`,
      },
      {
        title: 'Example Azure DevOps stage',
        language: 'yaml',
        code: `- stage: TrivyScan
  displayName: Trivy Security Scan
  dependsOn: DockerBuild

  jobs:
  - job: Scan

    steps:
    - script: |
        trivy image \\
          --severity HIGH,CRITICAL \\
          --exit-code 1 \\
          $(imageName):$(imageTag)
      displayName: Scan Docker Image`,
      },
      {
        title: 'One simple approach is to install it in the pipeline',
        language: 'yaml',
        code: `- script: |
    sudo apt-get update
    sudo apt-get install -y wget

    wget -qO- https://aquasecurity.github.io/trivy-repo/deb/public.key \\
      | gpg --dearmor \\
      | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null

    echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] \\
      https://aquasecurity.github.io/trivy-repo/deb \\
      generic main" \\
      | sudo tee /etc/apt/sources.list.d/trivy.list

    sudo apt-get update
    sudo apt-get install -y trivy

    trivy --version
  displayName: Install Trivy`,
      },
      {
        title: 'Suppose your pipeline does',
        language: 'text',
        code: `Docker Build
     |
     v
payment-api:125
     |
     v
Trivy
     |
     +---- FAIL
     |
     +---- PASS
            |
            v
           ACR`,
      },
      {
        title: 'Scanning the image before ACR push - commands',
        language: 'bash',
        code: `docker build -t payment-api:125 .

trivy image \\
  --severity HIGH,CRITICAL \\
  --exit-code 1 \\
  payment-api:125

docker tag payment-api:125 myacr.azurecr.io/payment-api:125
docker push myacr.azurecr.io/payment-api:125`,
      },
      {
        title: 'Can Trivy scan an image already in ACR? - commands',
        language: 'bash',
        code: `trivy image myacr.azurecr.io/payment-api:125`,
      },
      {
        title: 'Can Trivy scan an image already in ACR? - snippet',
        language: 'text',
        code: `Build -> Scan -> Push -> Deploy

Build -> Push -> Scan -> Deploy`,
      },
      {
        title: 'Trivy may show something like',
        language: 'text',
        code: `Installed Version: 1.2.3
Fixed Version:     Not Available`,
      },
      {
        title: 'Use an allowlist carefully - snippet',
        language: 'text',
        code: `CVE-xxxxx
CVE-yyyyy
CVE-zzzzz`,
      },
      {
        title: 'Generate a report - commands',
        language: 'bash',
        code: `trivy image \\
  --format json \\
  --output trivy-report.json \\
  payment-api:25`,
      },
      {
        title: 'Your pipeline could therefore be',
        language: 'text',
        code: `Code
 |
 +--> SonarQube
 |
 +--> Tests
 |
 v
Docker Build
 |
 v
Trivy
 |
 v
ACR
 |
 v
AKS`,
      },
      {
        title: 'Complete example for a React + Spring Boot application',
        language: 'text',
        code: `             Git
              |
              v
        Build React
              |
              v
      Build Spring Boot
              |
              v
            Tests
              |
              v
          SonarQube
              |
              v
         Docker Build
              |
              v
       Trivy Image Scan
              |
       +------+------+
       |             |
     FAIL           PASS
       |             |
   Stop pipeline     v
                    ACR
                     |
                     v
                    AKS`,
      },
      {
        title: 'Strong interview answer - commands',
        language: 'bash',
        code: `trivy image \\
  --severity HIGH,CRITICAL \\
  --exit-code 1 \\
  payment-api:25`,
      },
    ],
    followUps: [
      'A CRITICAL CVE has no fixed version and it is blocking a release. Walk me through what you do.',
      'A new CVE is published for an image already running in production. How would you find and rescan affected images?',
    ],
    tags: ['trivy', 'security', 'container scanning'],
  },
  {
    id: 'itv-rdel-29',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage secrets in Kubernetes?',
    probing:
      'Whether you know native Secrets are only base64 and can layer encryption at rest, external stores, RBAC and rotation on top.',
    answer: [
      'Kubernetes has a built-in `Secret` object, but by default it only base64-encodes the value — it is **not encrypted** unless you explicitly configure encryption at rest. So I treat native Secrets as a starting point, not the full solution.',
      '**1. Basic Kubernetes Secret**',
      "`kubectl create secret generic db-secret --from-literal=DB_PASSWORD='<db-password>' -n production`",
      'I generally prefer mounting secrets as a **volume** rather than an environment variable where possible — env vars can be exposed more easily through `/proc`, crash dumps, or logging of the process environment.',
      '**2. Enable encryption at rest**',
      'By default, Secrets stored in etcd are only base64-encoded. For AKS/self-managed clusters, I make sure encryption at rest is enabled so the actual etcd data is encrypted, not just obfuscated.',
      "**3. Don't commit Secret manifests to Git**",
      'I never commit a raw `Secret` YAML with real values. Options I use instead:',
      "- **Sealed Secrets** — encrypt the secret so it's safe to commit; only the cluster controller can decrypt it.\n- **External Secrets Operator** — syncs secrets from an external store (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault) into Kubernetes Secrets automatically.",
      '**4. Azure Key Vault + Secrets Store CSI Driver / Workload Identity (my preferred approach for AKS)** (see code below)',
      'This avoids storing the secret in Kubernetes at all — the Pod retrieves it directly from Key Vault at runtime through a mounted volume.',
      '**5. RBAC** - I restrict who/what can read Secrets: (see code below)',
      'Only the specific ServiceAccounts/roles that need a Secret should have `get`/`list` access to it.',
      "**6. Rotation** - Since credentials can be compromised, I use Key Vault's rotation capability combined with the CSI driver's periodic sync, rather than manually rotating and redeploying Secrets.",
      '**Interview answer** - "Kubernetes Secrets are only base64-encoded by default, not encrypted, so I don\'t treat them as sufficient on their own. I enable encryption at rest for etcd, and I never commit raw Secret manifests to Git — I either use Sealed Secrets or, more commonly on AKS, the Azure Key Vault Secrets Store CSI Driver with Workload Identity, so the Pod retrieves secrets directly from Key Vault and they\'re never stored as plain Kubernetes Secret objects. I mount secrets as volumes rather than environment variables where possible, restrict access with RBAC scoped to specific secret names, and rely on Key Vault rotation instead of manually rotating and redeploying secrets."',
    ],
    code: [
      {
        title: 'Basic Kubernetes Secret - commands',
        language: 'bash',
        code: `kubectl create secret generic db-secret \\
  --from-literal=DB_PASSWORD='<db-password>' \\
  -n production`,
      },
      {
        title: 'Basic Kubernetes Secret',
        language: 'yaml',
        code: `env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-secret
        key: DB_PASSWORD`,
      },
      {
        title:
          'Azure Key Vault + Secrets Store CSI Driver / Workload Identity (my preferred approach for AKS)',
        language: 'text',
        code: `AKS Pod
   |
   | Workload Identity
   v
Azure Key Vault
   |
   v
Secret mounted as a volume (never stored as a K8s Secret object)`,
      },
      {
        title: 'I restrict who/what can read Secrets',
        language: 'yaml',
        code: `rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["db-secret"]`,
      },
    ],
    followUps: [
      'How does the Secrets Store CSI Driver optionally sync a mounted secret into a Kubernetes Secret, and when would you want that?',
      'How does Workload Identity link a Kubernetes ServiceAccount to a Microsoft Entra identity?',
    ],
    tags: ['kubernetes', 'secrets', 'key vault'],
  },
]
