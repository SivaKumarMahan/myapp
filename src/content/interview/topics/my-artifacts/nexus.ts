import type { InterviewQuestion } from '../../../types'

/** Sonatype Nexus Repository interview questions. */
export const myNexusQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myart-16',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Sonatype Nexus Repository, and why is it used in CI/CD pipelines?',
    probing:
      'Whether you know what Nexus stores, what it does in CI/CD and what it does not replace.',
    answer: [
      'Sonatype Nexus Repository is a repository manager. It stores, proxies, organizes and distributes software components such as Maven packages, npm packages, NuGet packages, Python packages, Helm charts and container images.',
      'In CI/CD, I use it as the controlled system of record for dependencies and build outputs: It provides:',
      '- A central location for internal artifacts.\n- Package-manager-native endpoints.\n- Caching of approved external dependencies.\n- Faster and more repeatable builds.\n- Reduced direct internet dependency.\n- Authentication, authorization and auditability.\n- Release/snapshot separation.\n- Retention and cleanup controls.\n- A stable artifact URL independent of one pipeline run.\n- Integration points for vulnerability policy and supply-chain governance.',
      'Nexus should store build artifacts that are immutable, meaning they never change once created. It should not store source code. Git stays the source-code system. The CI/CD platform stays responsible for building, testing, approving and deploying.',
      'The answers use an Azure-focused project model:',
      'Nexus Repository stores and distributes build inputs and outputs. Azure DevOps, Jenkins or GitHub Actions orchestrates the pipeline; Nexus does not replace the CI/CD engine.',
    ],
    code: [
      {
        title: 'Dependency and publication flows',
        language: 'text',
        code: `external dependency
-> Nexus proxy cache
-> Nexus group endpoint
-> developer and CI build

internal source
-> build and tests
-> versioned package/image
-> Nexus hosted repository
-> controlled promotion/deployment`,
      },
      {
        title: 'Azure-focused project model',
        language: 'text',
        code: `developer or CI pipeline
-> Nexus Repository group for dependency downloads
-> compile, test and security checks
-> publish internal package to a hosted repository
-> promote the same approved artifact
-> deploy to Azure compute or AKS`,
      },
    ],
    tags: ['nexus', 'basics'],
  },
  {
    id: 'itv-myart-17',
    level: 'basic',
    kind: 'open',
    prompt:
      'What repository types does Nexus offer, and what is the difference between hosted, proxy and group?',
    probing:
      'Whether you know hosted, proxy and group repositories, their read/write roles and why group order matters.',
    answer: [
      'The three main repository types are:',
      '1. **Hosted repository:** Stores packages produced or deliberately uploaded by the organization.\n2. **Proxy repository:** Proxies and caches a remote package repository.\n3. **Group repository:** Presents multiple compatible hosted, proxy or nested group repositories through one client URL.',
      'Developers normally download from the group. CI publishes to the appropriate hosted repository. A proxy is not a normal publication destination.',
      'Nexus also separates the repository format from its type. For example, `maven2 (hosted)`, `maven2 (proxy)` and `maven2 (group)` share the Maven format but perform different roles.',
      '- **Hosted**: Purpose: Store organization-owned or approved uploaded components; Read behavior: Reads local content; Write behavior: CI publishes here; Example: `maven-releases`\n- **Proxy**: Purpose: Cache a remote repository; Read behavior: Serves cache or fetches from remote; Write behavior: Clients do not publish internal builds here; Example: `maven-central-proxy`\n- **Group**: Purpose: Combined compatible repositories behind one URL; Read behavior: Searches members in configured order; Write behavior: Normally read-only; some Pro formats support a selected writable member; Example: `maven-public`',
      'A proxy cache is controlled by component and metadata cache-age settings. Nexus checks the local cache first and consults the remote source when required.',
      'A group simplifies client configuration, but member order matters. If two members contain the same coordinate, the first matching repository wins.',
      'I put trusted internal sources and proxies in a deliberate order. I also use routing rules and content governance to cut the risk of dependency confusion, where a malicious public package with the same name could get pulled in instead of the internal one.',
      'Permissions on a group endpoint allow users to consume member content through that group. They do not automatically grant direct access to every member URL.',
    ],
    code: [
      {
        title: 'Example Maven repository design',
        language: 'text',
        code: `maven-releases       hosted
maven-snapshots      hosted
maven-central-proxy  proxy
maven-public         group containing the three repositories`,
      },
    ],
    tags: ['nexus', 'hosted', 'proxy', 'group'],
  },
  {
    id: 'itv-myart-18',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the purpose of a Repository Group in Nexus?',
    probing:
      'Whether you know a group gives one stable URL and that member order must be deliberate.',
    answer: [
      'A repository group provides one stable URL that aggregates several repositories of a compatible format.',
      'Developers configure only `maven-public`. Administrators can add, remove or reorder back-end repositories without modifying every developer and pipeline configuration. Groups improve:',
      '- Client simplicity.\n- Central policy enforcement.\n- Migration flexibility.\n- Availability of internal and external components through one endpoint.\n- Consistent authentication.',
      'Member order must be deliberate. I also avoid placing untrusted repositories ahead of internal namespaces because the wrong component could be selected.',
    ],
    code: [
      {
        title: 'Maven group and its members',
        language: 'text',
        code: `maven-public group
├── maven-releases hosted
├── maven-snapshots hosted
├── approved-third-party hosted
└── maven-central-proxy proxy`,
      },
    ],
    tags: ['nexus', 'group repository'],
  },
  {
    id: 'itv-myart-19',
    level: 'basic',
    kind: 'open',
    prompt: 'How do developers consume artifacts stored in Nexus Repository?',
    probing: 'Whether you point clients at a group URL and supply credentials safely.',
    answer: [
      'Developers configure their package manager to resolve from a Nexus group URL rather than contacting every hosted and public repository directly.',
      'The package manager requests a coordinate such as:',
      'Nexus searches the group members in order and returns either an internal hosted artifact or a cached/proxied external dependency.',
      "Credentials are supplied through the developer's approved credential/token mechanism, not committed in project files. CI uses a separate non-human read identity.",
    ],
    code: [
      {
        title: 'Group URLs per client',
        language: 'text',
        code: `Maven/Gradle -> https://nexus.example.com/repository/maven-public/
npm          -> https://nexus.example.com/repository/npm-group/
NuGet        -> https://nexus.example.com/repository/nuget-group/index.json
PyPI         -> https://nexus.example.com/repository/pypi-group/simple
Docker/OCI   -> nexus-docker.example.com/team/image:version`,
      },
      {
        title: 'Example coordinate',
        language: 'text',
        code: `com.example:orders-client:2.4.0`,
      },
    ],
    tags: ['nexus', 'consumption'],
  },
  {
    id: 'itv-myart-20',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How does Nexus Repository act as a proxy for public repositories such as Maven Central or npm?',
    probing: 'Whether you understand proxy caching, cache age, the negative cache and its limits.',
    answer: [
      "An administrator creates a proxy repository with the public repository's remote URL and cache settings. Developers point their clients to the Nexus group, not directly to the public service.",
      'Nexus uses maximum-age settings on components and metadata to decide when cached data needs revalidating. It also has a negative cache: if a request 404s, Nexus remembers that for a while, so a component published to the remote right after can take a bit longer to show up. Benefits include:',
      '- Fewer repeated external downloads.\n- Faster builds near the Nexus server.\n- Reduced internet egress.\n- A central allow/deny and routing point.\n- Some resilience when the remote service is unavailable, but only for already cached content.\n- Visibility into which components the organization consumes.',
      'I restrict Nexus outbound access to approved registries and use TLS validation. A proxy does not mean every remote component is safe; vulnerability, license, signature and policy controls remain necessary.',
    ],
    code: [
      {
        title: 'Proxy request flow',
        language: 'text',
        code: `client requests package
-> Nexus checks local cache
-> cache hit: Nexus returns local content
-> cache miss: Nexus requests approved remote
-> Nexus stores response and metadata
-> Nexus returns it to client
-> later clients reuse cache`,
      },
    ],
    tags: ['nexus', 'proxy', 'caching'],
  },
  {
    id: 'itv-myart-21',
    level: 'basic',
    kind: 'open',
    prompt: 'What package formats are supported by Sonatype Nexus Repository?',
    probing:
      'Whether you know the main supported formats, the Raw format, and to check the version matrix.',
    answer: [
      'Current Nexus Repository documentation lists formats including:',
      '- Alpine.\n- Ansible.\n- Apt.\n- CocoaPods.\n- Composer/PHP.\n- Conan.\n- Conda.\n- Docker/OCI.\n- Git LFS.\n- Go.\n- Helm.\n- Hugging Face.\n- Maven.\n- npm.\n- NuGet.\n- p2.\n- Pub.\n- PyPI.\n- R.\n- Raw.\n- RubyGems.\n- Rust/Cargo.\n- Swift.\n- Terraform.\n- Yum.',
      'The **Raw** format stores arbitrary files when no native package format applies.',
      'Which formats support hosted, proxy and group repositories can differ by Nexus edition and release. In an interview, I talk about the formats relevant to the project — Maven, npm, NuGet, Docker and Helm — and then check the exact version matrix rather than assuming every format supports every repository type.',
    ],
    tags: ['nexus', 'formats'],
  },
  {
    id: 'itv-myart-22',
    level: 'basic',
    kind: 'open',
    prompt: 'What are snapshot and release repositories, and why are they kept separate?',
    probing: 'Whether you know why snapshots and immutable releases live in separate repositories.',
    answer: [
      'Snapshots represent work in progress. Releases represent approved, immutable versions.',
      '- **Example**: Snapshot: `2.4.0-SNAPSHOT`; Release: `2.4.0`\n- **Stability**: Snapshot: May change as development continues; Release: Must remain immutable\n- **Retention**: Snapshot: Aggressive cleanup is normal; Release: Retain according to deployment/compliance policy\n- **Redeploy**: Snapshot: Often permitted by snapshot policy; Release: Normally disabled\n- **Consumer**: Snapshot: Development/test; Release: Controlled release consumers',
      'Maven can turn a snapshot into timestamped snapshot artifacts internally, while the logical `-SNAPSHOT` version stays the same.',
      'Keeping them separate stops an unstable build from being mistaken for a release. It also lets each side have its own retention, write access and deployment policy. Production should never resolve an unpinned snapshot.',
    ],
    tags: ['nexus', 'snapshots', 'releases'],
  },
  {
    id: 'itv-myart-23',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between Nexus Repository OSS (Community Edition) and Nexus Repository Pro?',
    probing:
      'Whether you know Community vs Professional edition features and that Firewall/IQ may be separate.',
    answer: [
      'The offering historically called OSS is now called **Community Edition** in the current documentation. The licensed enterprise offering is **Professional Edition**. Exact packaging and entitlement can change over time, so I confirm the version-specific feature matrix during design rather than assuming.',
      'Community Edition provides the core repository-manager capabilities needed to host, proxy and group the supported formats.',
      'Professional Edition adds enterprise capabilities that currently include areas such as:',
      '- Supported high availability/resilient architectures.\n- SAML/SSO and additional enterprise identity integrations.\n- User-token support.\n- Staging and build promotion.\n- Content replication.\n- Tagging.\n- Repository import/export.\n- Azure Blob Store support.\n- Group blob stores.\n- Additional cleanup/version-retention controls.\n- Writable group deployment for selected formats.\n- Enterprise support.',
      "Sonatype's Repository Firewall, Lifecycle and IQ supply-chain policy tools may be separate products or licenses. I do not assume every vulnerability or quarantine feature is automatically included in Nexus Pro.",
      'The choice comes down to availability targets, identity needs, storage, promotion workflow, support and compliance requirements. It is not just about how many artifacts you store.',
    ],
    tags: ['nexus', 'community edition', 'pro'],
  },
  {
    id: 'itv-myart-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How would you configure Azure DevOps to publish artifacts to Nexus Repository?',
    probing:
      'Whether you can wire Maven publishing from Azure Pipelines to Nexus with matching IDs and Key Vault secrets.',
    answer: [
      'For a Maven project, I configure:',
      '1. A least-privilege Nexus CI service account — one that only gets the access it actually needs, nothing more.\n2. A hosted snapshots repository and hosted releases repository.\n3. `distributionManagement` in `pom.xml`.\n4. A Maven `settings.xml` whose server ID matches the POM repository ID.\n5. Nexus credentials stored as protected Azure DevOps secrets, preferably retrieved from Azure Key Vault.\n6. A branch/tag rule deciding whether a snapshot or release can publish.',
      '`.ci/settings.xml` contains references, not literal credentials:',
      'In a real pipeline I prefer one Maven invocation, such as `mvn clean deploy`, run after all required gates pass. Alternatively I deliberately preserve the exact tested workspace and artifact. Either way, I make sure the publish step never accidentally recompiles and ships different bytes than what was tested.',
      'The CI identity gets `add/edit` only on the required hosted repository. It does not get Nexus administration or delete permission. Pull-request pipelines never get publishing credentials at all.',
    ],
    code: [
      {
        title: 'pom.xml distributionManagement',
        language: 'text',
        code: `<distributionManagement>
  <repository>
    <id>nexus-releases</id>
    <url>https://nexus.example.com/repository/maven-releases/</url>
  </repository>
  <snapshotRepository>
    <id>nexus-snapshots</id>
    <url>https://nexus.example.com/repository/maven-snapshots/</url>
  </snapshotRepository>
</distributionManagement>`,
      },
      {
        title: '.ci/settings.xml with credential references',
        language: 'text',
        code: `<settings>
  <servers>
    <server>
      <id>nexus-releases</id>
      <username>\${env.NEXUS_USERNAME}</username>
      <password>\${env.NEXUS_PASSWORD}</password>
    </server>
    <server>
      <id>nexus-snapshots</id>
      <username>\${env.NEXUS_USERNAME}</username>
      <password>\${env.NEXUS_PASSWORD}</password>
    </server>
  </servers>
</settings>`,
      },
      {
        title: 'Azure Pipeline: build, test and publish to Nexus',
        language: 'yaml',
        code: `stages:
  - stage: Build
    jobs:
      - job: TestAndPackage
        pool:
          name: azure-ci-agents
        steps:
          - checkout: self
            clean: true

          - task: AzureKeyVault@2
            inputs:
              azureSubscription: azure-wif-ci-secrets
              KeyVaultName: <ci-key-vault-name>
              SecretsFilter: nexus-ci-username,nexus-ci-password

          - bash: |
              set -euo pipefail
              mvn -B --settings .ci/settings.xml clean verify
            displayName: Build and test
            env:
              NEXUS_USERNAME: $(nexus-ci-username)
              NEXUS_PASSWORD: $(nexus-ci-password)

          - bash: |
              set -euo pipefail
              mvn -B --settings .ci/settings.xml deploy -DskipTests
            displayName: Publish package to Nexus
            condition: |
              and(
                succeeded(),
                eq(variables['Build.SourceBranch'], 'refs/heads/main')
              )
            env:
              NEXUS_USERNAME: $(nexus-ci-username)
              NEXUS_PASSWORD: $(nexus-ci-password)`,
      },
    ],
    tags: ['nexus', 'azure devops', 'maven'],
  },
  {
    id: 'itv-myart-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you upload Docker images to Nexus Repository?',
    probing:
      'Whether you can push images to a Nexus Docker hosted repository securely and deploy by digest.',
    answer: [
      'First I create a Docker hosted repository and set up a connector or subdomain endpoint for it. Then I enable the Docker Bearer Token Realm, apply TLS, and grant the CI user upload privileges.',
      'If connector ports are used, the registry is similar to:',
      'I then record the pushed digest and deploy by digest where supported: Important controls:',
      '- Use HTTPS with a trusted certificate.\n- Do not use `--password` on the command line.\n- Give the pipeline write permission only to the hosted repository.\n- Scan before publication and continuously rescan stored images.\n- Use immutable version tags or digests; do not rely on `latest`.\n- Enable the Docker Bearer Token Realm.\n- Separate pull endpoints/groups from write endpoints unless an approved Pro writable-group design is used.',
    ],
    code: [
      {
        title: 'Log in, build, push and log out',
        language: 'bash',
        code: `NEXUS_REGISTRY=nexus-docker.example.com
IMAGE_NAME=orders-service
IMAGE_VERSION=2.4.0

printf '%s' "$NEXUS_PASSWORD" |
  docker login "$NEXUS_REGISTRY" \\
    --username "$NEXUS_USERNAME" \\
    --password-stdin

docker build \\
  --tag "$NEXUS_REGISTRY/$IMAGE_NAME:$IMAGE_VERSION" \\
  .

docker push \\
  "$NEXUS_REGISTRY/$IMAGE_NAME:$IMAGE_VERSION"

docker logout "$NEXUS_REGISTRY"`,
      },
      {
        title: 'Connector-port registry address',
        language: 'text',
        code: `nexus.example.com:5001`,
      },
      {
        title: 'Deploy by digest',
        language: 'text',
        code: `nexus-docker.example.com/orders-service@sha256:<digest>`,
      },
    ],
    tags: ['nexus', 'docker'],
  },
  {
    id: 'itv-myart-26',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you implement versioning and release management using Nexus Repository?',
    probing:
      'Whether you publish once with a clear version strategy and never overwrite a released coordinate.',
    answer: [
      'I use a documented version strategy appropriate to the package format:',
      '- Maven snapshot: `2.4.0-SNAPSHOT`.\n- Maven release: `2.4.0`.\n- Semantic version: `MAJOR.MINOR.PATCH`.\n- Pre-release: `2.5.0-rc.1`.\n- Docker readable tag: release version and/or Git commit.\n- Docker immutable identity: digest.',
      'The release rules I follow:',
      '1. The source commit is immutable and reviewed.\n2. CI generates the version from the release process.\n3. Tests, quality and security gates complete.\n4. CI publishes once to the correct hosted repository.\n5. Release repositories use a disable-redeploy policy where appropriate.\n6. The artifact checksum/digest is recorded.\n7. Environments receive the same artifact; they do not rebuild it.\n8. Release notes link version, commit, pipeline and artifact.',
      'I avoid overwriting a released coordinate. If `2.4.0` is incorrect, I publish `2.4.1`; I do not silently replace `2.4.0`.',
      "Nexus Pro's staging and build-promotion features can formalize this process. On other editions, the pipeline can do controlled publication and promotion itself through the repository APIs. Either way, it must verify that the source and destination bytes and checksums are identical.",
    ],
    tags: ['nexus', 'versioning', 'release management'],
  },
  {
    id: 'itv-myart-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How would you configure authentication and authorization in Nexus Repository?',
    probing:
      'Whether you separate authentication from privileges, roles and content selectors and harden admin access.',
    answer: [
      'I separate authentication from authorization.',
      'Authentication options depend on edition/deployment and can include:',
      '- Local Nexus users.\n- External identity realms such as LDAP.\n- SAML/SSO capabilities in applicable Pro deployments.\n- User tokens/API keys where supported.\n- Dedicated CI service accounts.',
      'Authorization is built from:',
      '- **Privileges:** Actions such as browse, read, add, edit, delete and repository administration.\n- **Roles:** Collections of privileges.\n- **Content selectors:** More detailed access to paths/namespaces.\n- **Users/groups:** Assigned one or more roles.',
      'As hardening steps, I also:',
      '- Disable anonymous access unless there is a justified read-only use case.\n- Change the initial administrator password.\n- Use named administrator accounts and MFA/SSO where available.\n- Avoid sharing `admin` credentials with pipelines.\n- Restrict role-management permissions because a user able to assign roles can escalate privileges.\n- Review access periodically and remove leavers/stale service accounts.\n- Keep Production publisher and reader permissions separate where required.',
    ],
    code: [
      {
        title: 'Example roles',
        language: 'text',
        code: `developers-read
  browse/read maven-public and npm-group

orders-ci-publisher
  browse/read/add/edit orders hosted repository
  no delete
  no repository administration

release-manager
  approved promotion operations

nexus-operator
  system operations without unnecessary artifact publication`,
      },
    ],
    tags: ['nexus', 'authentication', 'authorization'],
  },
  {
    id: 'itv-myart-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Nexus Repository with Azure DevOps, Jenkins or GitHub Actions?',
    probing:
      'Whether the same least-privilege publish pattern applies across Azure DevOps, Jenkins and GitHub Actions.',
    answer: [
      '**Azure DevOps integration**',
      '- Store the Nexus credential in Azure Key Vault/protected secret variables.\n- Inject it only into the publishing step.\n- Use Maven/Gradle/npm/NuGet/Docker native commands.\n- Do not expose publishing credentials to pull-request validation.',
      "**Jenkins:** The credential is folder-scoped. The job runs on an isolated agent. Command tracing is turned off around the secret use. I do not rely on Jenkins's log masking as protection against malicious pipeline code — masking hides a secret from the log, it does not stop a script from misusing it.",
      '**GitHub Actions:** For release publishing, I use a protected GitHub Environment. I restrict which reviewers and branches can trigger it, and I pin actions to reviewed commits.',
      'If Nexus is integrated with an enterprise identity/token broker, I prefer short-lived credentials. Otherwise I rotate the dedicated Nexus token/password through Azure Key Vault and keep its repository permissions minimal.',
    ],
    code: [
      {
        title: 'Integration pattern',
        language: 'text',
        code: `pipeline
-> authenticate with a least-privilege Nexus identity
-> configure package client
-> restore dependencies from group
-> build/test/scan
-> publish to hosted repository
-> record coordinate/checksum/digest`,
      },
      {
        title: 'Jenkins: publish with a folder-scoped credential',
        language: 'text',
        code: `withCredentials([
    usernamePassword(
        credentialsId: 'orders-nexus-publisher',
        usernameVariable: 'NEXUS_USERNAME',
        passwordVariable: 'NEXUS_PASSWORD'
    )
]) {
    sh '''
        set +x
        mvn -B --settings .ci/settings.xml clean deploy
    '''
}`,
      },
      {
        title: 'GitHub Actions: publish from main',
        language: 'yaml',
        code: `- name: Publish Maven package
  if: github.ref == 'refs/heads/main'
  env:
    NEXUS_USERNAME: \${{ secrets.NEXUS_USERNAME }}
    NEXUS_PASSWORD: \${{ secrets.NEXUS_PASSWORD }}
  run: |
    set +x
    mvn -B --settings .ci/settings.xml clean deploy`,
      },
    ],
    tags: ['nexus', 'jenkins', 'github actions'],
  },
  {
    id: 'itv-myart-29',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you configure Maven, Gradle, npm or NuGet clients to use Nexus Repository?',
    probing:
      'Whether you can configure Maven, Gradle, npm and NuGet to read from groups and publish to hosted repos.',
    answer: [
      '**Maven:** `settings.xml` routes dependency resolution to the group:',
      'Publishing credentials go under a `<server>` whose ID matches `distributionManagement`. Credentials are injected securely rather than committed.',
      '**Gradle:** Publishing uses a hosted URL in the `publishing.repositories` configuration, not the read group unless an explicitly supported writable-group feature is used.',
      '**npm:** Use an approved token mechanism and avoid committing `_authToken`.',
      "**NuGet:** I verify the Nexus repository's NuGet API version and endpoint. Version 3 group endpoints end in `/index.json`.",
    ],
    code: [
      {
        title: 'Maven settings.xml mirror',
        language: 'text',
        code: `<settings>
  <mirrors>
    <mirror>
      <id>nexus</id>
      <mirrorOf>*</mirrorOf>
      <url>https://nexus.example.com/repository/maven-public/</url>
    </mirror>
  </mirrors>
</settings>`,
      },
      {
        title: 'Gradle repository',
        language: 'text',
        code: `repositories {
    maven {
        url = uri("https://nexus.example.com/repository/maven-public/")
        credentials {
            username = System.getenv("NEXUS_USERNAME")
            password = System.getenv("NEXUS_PASSWORD")
        }
    }
}`,
      },
      {
        title: '.npmrc',
        language: 'text',
        code: `registry=https://nexus.example.com/repository/npm-group/
always-auth=true`,
      },
      {
        title: 'npm publish to hosted',
        language: 'bash',
        code: `npm publish \\
  --registry=https://nexus.example.com/repository/npm-hosted/`,
      },
      {
        title: 'nuget.config',
        language: 'text',
        code: `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add
      key="Nexus"
      value="https://nexus.example.com/repository/nuget-group/index.json" />
  </packageSources>
</configuration>`,
      },
      {
        title: 'dotnet nuget push to hosted',
        language: 'bash',
        code: `dotnet nuget push package.nupkg \\
  --source https://nexus.example.com/repository/nuget-hosted/ \\
  --api-key "$NEXUS_API_KEY"`,
      },
    ],
    tags: ['nexus', 'maven', 'npm', 'nuget'],
  },
  {
    id: 'itv-myart-30',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle access control for different development teams in Nexus Repository?',
    probing:
      'Whether you design team-based roles, content selectors and separate service accounts.',
    answer: [
      'The access controls I use:',
      '- Identity-provider groups mapped to Nexus roles.\n- Repository-view privileges.\n- Content selectors for namespace/path-level separation.\n- Separate service accounts for each pipeline/team.\n- Environment-specific release permissions.\n- Periodic access reviews.\n- Immediate leaver/service-account cleanup.',
      'Read permission on a group can expose the content of all its members through that group. So I never put restricted artifacts inside a broadly readable group.',
    ],
    code: [
      {
        title: 'Team-based roles',
        language: 'text',
        code: `team-orders-developers
  read/browse common groups
  no release write

team-orders-ci
  read group
  add/edit only orders snapshot/release namespace
  no delete/admin

team-payments-ci
  separate hosted namespace and credential

release-managers
  approved promotion operation

repository-operators
  repository/system administration`,
      },
    ],
    tags: ['nexus', 'teams', 'access control'],
  },
  {
    id: 'itv-myart-31',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What are the advantages of using Nexus Repository instead of storing build artifacts directly in Azure DevOps Pipeline Artifacts?',
    probing:
      'Whether you know Nexus and Azure Pipeline Artifacts solve different problems and can coexist.',
    answer: [
      'They solve different problems.',
      '- **Long-lived package repository**: Primarily tied to a pipeline run\n- **Native Maven/npm/NuGet/Docker/other protocols**: General pipeline output transfer/download\n- **Hosted, proxy and group behavior**: No universal external dependency proxy/group\n- **Shared across teams and CI platforms**: Closely integrated with Azure Pipelines\n- **Package coordinates/version browsing**: Run/build-oriented identity\n- **Central retention and release policy**: Pipeline retention policy\n- **Developer package-manager consumption**: Excellent between pipeline jobs/stages',
      'I use Pipeline Artifacts for logs, test results, intermediate files or handoff within an Azure pipeline. I use Nexus for reusable, versioned software packages and centralized dependency proxying.',
    ],
    code: [
      {
        title: 'Using both',
        language: 'text',
        code: `test report -> Azure Pipeline Artifact
approved JAR/npm/NuGet/image -> Nexus Repository`,
      },
    ],
    tags: ['nexus', 'pipeline artifacts'],
  },
  {
    id: 'itv-myart-32',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you configure retention policies or clean up old artifacts in Nexus Repository?',
    probing:
      'Whether you define retention from requirements, test cleanup policies and know compaction is what frees space.',
    answer: [
      'I define retention from business and recovery requirements before enabling deletion. Process:',
      '1. Classify repositories: snapshots, releases, proxy caches and regulatory artifacts.\n2. Define cleanup criteria such as last downloaded, last updated, age, regex/version pattern or format-specific rules.\n3. Preview/test the policy against a non-production or representative repository.\n4. Assign cleanup policies to hosted/proxy repositories.\n5. Schedule repository cleanup tasks during an appropriate window.\n6. Retain soft-deleted blobs for a recovery period where supported.\n7. Run the compact blob-store task off-peak to reclaim physical storage.\n8. Monitor results and available storage.',
      'Cleanup only soft-deletes content at first. Blob-store compaction is the step that permanently reclaims the space. I never schedule compaction without a tested backup, a recovery plan, and a policy review first.',
      'Nexus Pro offers additional retention controls such as retaining selected versions. Exact criteria depend on format and product version.',
    ],
    code: [
      {
        title: 'Example cleanup policy',
        language: 'text',
        code: `snapshot repository:
  delete snapshots older than approved age
  retain recent versions needed for active branches

release repository:
  never delete deployed/legally retained releases automatically
  retain all supported and rollback versions

proxy repository:
  remove components not downloaded for the approved cache period`,
      },
    ],
    followUps: [
      'Why does cleanup not immediately free disk space?',
      'Which releases must never be cleaned up automatically?',
    ],
    tags: ['nexus', 'retention', 'cleanup'],
  },
  {
    id: 'itv-myart-33',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you back up and restore a Nexus Repository instance?',
    probing:
      'Whether you back up database and blob stores consistently and test restores against RPO/RTO.',
    answer: [
      'A valid backup must protect the matching set of:',
      '- Nexus database containing metadata and configuration.\n- Blob stores containing artifact binaries.\n- Required data-directory/application configuration.\n- Encryption/secret material required to restore the instance.\n- License and deployment configuration where applicable.',
      "For an embedded H2 deployment, I use the supported database backup task, and I back up the other required data at the same time so everything stays consistent. For PostgreSQL, I use a supported PostgreSQL backup or point-in-time-recovery process, coordinated with blob-store backups or snapshots, following Sonatype's guidance. High-level restore:",
      '1. Declare an outage/recovery window and stop writes.\n2. Provision the same supported Nexus version/configuration.\n3. Restore the database and matching blob-store recovery point.\n4. Restore required data/configuration securely.\n5. Start Nexus and inspect startup logs.\n6. Verify repositories and blob-store state.\n7. Test representative downloads and a controlled publication.\n8. Run only supported integrity/repair procedures when required, preferably with Sonatype Support for data inconsistency.\n9. Confirm clients/pipelines and monitoring.',
      'I test restore regularly and measure the actual recovery point and recovery time objectives (RPO/RTO). A backup job reporting success is not proof the system can actually be recovered.',
      'I avoid taking an uncoordinated live filesystem copy. If the database metadata and the blob content are captured at slightly different moments, they can end up inconsistent with each other.',
    ],
    followUps: [
      'Why is an uncoordinated filesystem copy dangerous?',
      'How do you prove a Nexus backup is restorable?',
    ],
    tags: ['nexus', 'backup', 'restore'],
  },
  {
    id: 'itv-myart-34',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you migrate artifacts from JFrog Artifactory to Nexus Repository?',
    probing:
      'Whether you can map Artifactory repositories to Nexus and migrate with validation, delta sync and rollback.',
    answer: [
      'I treat it as a controlled platform migration, not only a file copy. Plan:',
      '1. Inventory repositories, formats, size, artifact counts, clients, permissions, retention, checksums and custom workflows.\n2. Identify unsupported/edition-specific features and redesign them.\n3. Build Nexus repositories, blob stores, TLS, identities, roles and groups.\n4. Migrate users/groups through the approved identity system rather than copying passwords.\n5. Export local Artifactory repository content.\n6. Import into Nexus hosted repositories using the Pro import process, or republish through native clients/scripts where that feature is unavailable.\n7. Recreate external sources as Nexus proxy repositories rather than copying an entire remote cache blindly.\n8. Optionally proxy Artifactory temporarily from Nexus for artifacts not yet migrated.\n9. Update pilot builds to use Nexus group/hosted endpoints.\n10. Validate coordinates, checksums, representative builds, publish/download, access and performance.\n11. Freeze new writes to Artifactory, perform final delta migration and switch clients.\n12. Monitor, keep a rollback window and retire Artifactory only after acceptance.',
      'Configuration, permissions, virtual/group order, properties and metadata do not necessarily migrate one-to-one. Component counts and storage sizes may also differ because repository managers store indexes/metadata differently.',
      'I do not just blindly redirect every URL. I update clients to point at explicit Nexus endpoints and verify the behavior works.',
    ],
    code: [
      {
        title: 'Repository type mapping',
        language: 'text',
        code: `Artifactory local  -> Nexus hosted
Artifactory remote -> Nexus proxy
Artifactory virtual -> Nexus group`,
      },
    ],
    followUps: [
      'How would you handle artifacts not yet migrated during the transition?',
      'How do you validate that checksums match after migration?',
    ],
    tags: ['nexus', 'artifactory', 'migration'],
  },
  {
    id: 'itv-myart-35',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure sensitive artifacts stored in Nexus Repository?',
    probing:
      'Whether you apply defence in depth to Nexus: TLS, network, identity, least privilege, immutability and audit.',
    answer: [
      'I apply defense in depth:',
      '- HTTPS only with trusted certificates.\n- Restricted network exposure through private connectivity/firewalls/reverse proxy.\n- Anonymous access disabled unless explicitly justified.\n- Enterprise SSO/MFA where supported.\n- Least-privilege roles and content selectors.\n- Separate identities for humans, CI readers, CI publishers and administrators.\n- Secrets stored in Azure Key Vault, not pipeline YAML or client project files.\n- Encryption at rest through the database/blob-storage design.\n- Immutable release coordinates and disabled redeploy.\n- Audit/security logging and alerts for unusual download/upload/delete behavior.\n- Supported Nexus/Java/OS versions and timely patching.\n- Routing rules to constrain namespace/source behavior.\n- Artifact scanning, SBOM, signing and checksum verification in the supply-chain process.\n- Tested backups with restricted access.',
      'If an artifact is confidential, I also keep it out of any broadly readable group and restrict who can access backups and support bundles. Even when the binary itself is encrypted, the name and metadata around it can still be sensitive.',
      'I never run Nexus as the operating-system root account.',
    ],
    followUps: [
      'Why can group read permission expose restricted artifacts?',
      'What would you alert on in Nexus audit logs?',
    ],
    tags: ['nexus', 'security'],
  },
  {
    id: 'itv-myart-36',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How would you troubleshoot a pipeline that fails to publish artifacts to Nexus?',
    probing:
      'Whether you start from the HTTP status and repository type and work through a clear checklist.',
    answer: [
      'I start with the exact HTTP status and client error.',
      '- **401**: Missing/invalid credential, wrong auth realm/token\n- **403**: Authenticated but missing add/edit privilege, content selector or policy block\n- **404**: Wrong repository URL/name/path or reverse-proxy routing\n- **400/409**: Invalid package metadata, duplicate/redeploy policy or format-specific conflict\n- **5xx**: Nexus/database/blob-store/internal failure\n- **Timeout**: DNS, TLS, firewall, reverse proxy, saturation (how close a resource is to its limit) or remote storage latency',
      'My troubleshooting flow:',
      '1. Confirm the failure is publish, not dependency restore.\n2. Record pipeline run, package coordinate, target URL, status and Nexus request ID/time.\n3. Verify DNS and TLS chain from the same agent.\n4. Check the endpoint is a compatible **hosted** repository.\n5. Validate credentials without printing them.\n6. Verify repository privileges and content selectors for that exact path.\n7. Check release/snapshot version policy and redeploy policy.\n8. Confirm package metadata and filename/coordinate.\n9. Check Nexus status/writable endpoint, logs, database and blob-store capacity.\n10. Compare with the last successful run/configuration.\n11. Retry only if evidence shows a temporary failure.',
      'For Docker, I additionally verify the Docker Bearer Token Realm, connector/subdomain, TLS certificate and separate login to the correct endpoint.',
      'For Maven, I check that the `distributionManagement` repository ID matches the `<server>` ID in `settings.xml`.',
    ],
    tags: ['nexus', 'publish', 'troubleshooting'],
  },
  {
    id: 'itv-myart-37',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you monitor the health and storage utilization of a Nexus Repository server?',
    probing:
      'Whether you monitor the application, JVM, data services and infrastructure layers and forecast capacity.',
    answer: [
      'I monitor four layers:',
      '1. **Application:** Status/writable endpoints, request rate, latency, error codes, task failures and read-only state.\n2. **JVM/process:** Heap, garbage collection, threads, file descriptors, CPU and restarts.\n3. **Data services:** PostgreSQL availability/latency/connections, blob-store state, capacity and I/O latency.\n4. **Infrastructure:** VM/Pod health, disk, network, load balancer and certificate expiry.',
      'The Nexus status endpoint does not replace database, disk or infrastructure monitoring.',
      'In Azure, I send host/container and Nexus logs to Azure Monitor/Log Analytics and use the approved metrics platform. Alerts include:',
      '- Status/read/write failure.\n- HTTP 5xx or latency increase.\n- Blob-store/disk thresholds and rapid growth.\n- PostgreSQL failures or saturation.\n- JVM memory/GC pressure.\n- Cleanup/backup/task failure.\n- Certificate nearing expiry.\n- Authentication failures and unusual artifact deletion/download.',
      'I forecast capacity rather than waiting for a disk-full outage. The repository size shown in the UI may not include all of the metadata, index and storage overhead, so I also watch the underlying blob-store metrics directly.',
    ],
    code: [
      {
        title: 'Nexus health endpoints',
        language: 'text',
        code: `GET /service/rest/v1/status
GET /service/rest/v1/status/writable
GET /service/metrics/healthcheck`,
      },
    ],
    tags: ['nexus', 'monitoring'],
  },
  {
    id: 'itv-myart-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can Nexus Repository improve build performance in an enterprise environment?',
    probing:
      'Whether you know how proxy caching speeds builds, what to measure, and when Nexus makes builds slower.',
    answer: [
      'Nexus caches external dependencies near developers and build agents. The first request may still go out to the remote source, but later builds reuse the cached copy instead.',
      'Performance improvements come from:',
      '- Avoiding repeated internet downloads.\n- One group endpoint instead of many remote lookups.\n- Local high-bandwidth/low-latency access.\n- Reduced remote rate-limit exposure.\n- Retaining commonly used components.\n- Scaling Nexus, PostgreSQL and blob storage for measured traffic.\n- Placing Nexus near CI runners and developers or using a supported multi-site design.',
      'To prove it, I measure:',
      '- Cache hit/miss behavior.\n- Download latency.\n- Remote fetch latency.\n- Nexus CPU/JVM.\n- Database latency.\n- Blob-store IOPS/throughput.\n- Network throughput.\n- Client concurrency.',
      'A proxy can also make builds slower. That happens if Nexus is undersized, its blob or database storage is slow, it does too many remote checks, or network latency is high. Cache settings need to balance freshness against performance.',
    ],
    tags: ['nexus', 'build performance'],
  },
  {
    id: 'itv-myart-39',
    level: 'advanced',
    kind: 'open',
    prompt: 'What best practices would you follow when deploying Nexus Repository in Production?',
    probing:
      'Whether you have a complete production checklist covering sizing, storage, security, backup and ownership.',
    answer: [
      'My Production checklist includes:',
      '- Size from measured request, component and storage growth.\n- Use a supported current Nexus, Java, database and operating system.\n- Run Nexus under a dedicated non-root service account.\n- Use external PostgreSQL for production-scale workloads according to Sonatype guidance.\n- Use supported durable blob storage; on Azure, validate edition support for Azure Blob Storage.\n- Use TLS and restrict network exposure.\n- Put a supported reverse proxy/load balancer in front where required.\n- Disable or tightly control anonymous access.\n- Integrate enterprise identity and least-privilege roles.\n- Separate hosted release, snapshot, proxy and group repositories.\n- Disable release redeploy.\n- Configure routing rules and approved external remotes.\n- Use cleanup policies and capacity alerts.\n- Back up database, blobs and configuration consistently.\n- Test restore, upgrade and rollback-from-backup procedures.\n- Monitor application, JVM, database, blob and infrastructure.\n- Patch in a tested maintenance process.\n- Pin pipeline clients/endpoints and protect their credentials in Azure Key Vault.\n- Scan, sign and retain an SBOM and provenance record for important releases — provenance meaning where the artifact came from and how it was built.\n- Document ownership, RPO, RTO, escalation and support procedures.',
      'I test representative restore, download, publish and client builds before declaring the service production-ready.',
    ],
    followUps: [
      'Why use external PostgreSQL for production Nexus?',
      'What would you test before declaring Nexus production-ready?',
    ],
    tags: ['nexus', 'production', 'best practices'],
  },
  {
    id: 'itv-myart-40',
    level: 'advanced',
    kind: 'open',
    prompt: 'How would you configure high availability or disaster recovery for Nexus Repository?',
    probing:
      'Whether you know HA is a Pro feature within one region and DR is designed separately across regions.',
    answer: [
      'Supported active/active high availability is a Nexus Repository Pro capability.',
      'Requirements include:',
      '- Same supported Nexus version/configuration on every node.\n- Separate failure domains (groups of resources that can fail together) for nodes.\n- Low-latency shared PostgreSQL and blob storage.\n- Health-aware load balancing.\n- Per-node local working storage as documented.\n- Monitoring of nodes, database, blob storage and inter-service latency.\n- Tested node-failure and upgrade procedures.',
      'I do not stretch one HA cluster across distant regions. The database and blob latency between regions creates consistency risk that can make the setup unsupported or unsafe. Cross-region disaster recovery is designed separately, using supported backups, replication or content-replication features, and a documented failover process. DR plan:',
      '1. Define RPO/RTO.\n2. Protect database with supported backup/PITR.\n3. Protect blob content with the approved storage recovery design.\n4. Preserve configuration/secret/license dependencies.\n5. Provision the secondary environment through IaC.\n6. Restore coordinated data.\n7. Validate integrity and representative client operations.\n8. Switch DNS/traffic through an approved process.\n9. Test regularly.',
      'HA reduces node downtime. It does not replace backup or regional disaster recovery.',
    ],
    code: [
      {
        title: 'Azure HA design',
        language: 'text',
        code: `clients
-> Azure/application load-balancing layer
-> multiple Nexus Pro nodes in one low-latency region
-> shared supported Azure Blob Store
-> external Azure Database for PostgreSQL Flexible Server`,
      },
    ],
    followUps: [
      'Why not stretch one Nexus HA cluster across regions?',
      'What does HA not protect you from?',
    ],
    tags: ['nexus', 'high availability', 'disaster recovery'],
  },
  {
    id: 'itv-myart-41',
    level: 'advanced',
    kind: 'open',
    prompt: 'What is the role of Nexus Repository in software supply-chain management?',
    probing:
      'Whether you see Nexus as a controlled distribution point that works alongside scanning, signing and admission.',
    answer: [
      'Nexus is the controlled distribution point for software inputs and outputs. It helps establish:',
      '- Which external sources builds may use.\n- Which internal artifact coordinate is authoritative.\n- Who uploaded and downloaded components.\n- Which immutable artifact was promoted/deployed.\n- Central dependency inventory and usage visibility.\n- An enforcement point for routing, access and retention.\n- Integration with scanning, policy, SBOM, signatures and provenance.',
      'Nexus alone does not prove that an artifact is safe. Repository management, Sonatype Firewall/Lifecycle where licensed, CI security checks, signing, admission/deployment verification and incident response work together.',
    ],
    code: [
      {
        title: 'Supply-chain flow through Nexus',
        language: 'text',
        code: `approved source
-> Nexus proxy/group
-> reproducible build
-> SAST/SCA/tests
-> artifact and SBOM
-> sign immutable checksum/digest
-> Nexus hosted/staging repository
-> approval/promotion
-> deployment verifies identity and digest`,
      },
    ],
    followUps: [
      'What is dependency confusion and how do routing rules help?',
      'Why does Nexus alone not prove an artifact is safe?',
    ],
    tags: ['nexus', 'supply chain'],
  },
  {
    id: 'itv-myart-42',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does Nexus Repository reduce dependency on external package repositories?',
    probing: 'Whether you know how proxying reduces external dependency and its real limitations.',
    answer: [
      'Nexus proxy repositories cache external packages and expose them through an internal group endpoint. Developers and CI systems no longer need direct access to every public repository. This provides:',
      '- Cached artifacts during some upstream outages.\n- Lower external bandwidth.\n- Central external-source configuration.\n- Reduced exposure to remote rate limits.\n- Ability to block or remove an upstream from client access.\n- Stable internal URLs.',
      'It still has limitations:',
      '- An uncached component still requires the upstream.\n- Metadata freshness/cache expiry can require upstream access.\n- A remote package removed before it is cached may remain unavailable.\n- Nexus itself becomes important shared infrastructure and needs HA/DR.\n- Cached malware remains malware unless policy detects/blocks it.',
      'For critical dependencies, I ensure release inputs are pinned, cached/hosted according to policy and included in recovery planning.',
    ],
    tags: ['nexus', 'proxy', 'resilience'],
  },
  {
    id: 'itv-myart-43',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you automate artifact promotion from Development to Production using Nexus Repository?',
    probing:
      'Whether you promote one immutable artifact with verified checksums and never rename a snapshot into a release.',
    answer: [
      'I promote one immutable artifact through the environments. I do not rebuild it for each one.',
      'The promotion pipeline validates:',
      '- Source coordinate exists.\n- Source is immutable.\n- Test/security policy passed.\n- Approver is authorized.\n- Destination coordinate does not already contain different bytes.\n- Source and destination checksum/digest match.\n- Release metadata records commit, pipeline and approver.',
      'With Nexus Pro, I use supported staging/build-promotion capabilities when they match the format and process. Without that capability, the pipeline can download once, verify checksum/signature and upload through the supported native/REST interface to a release hosted repository.',
      'It then downloads or queries the destination to verify equality.',
      'For Maven, snapshot and release coordinates are different things. I do not just rename a mutable snapshot and call it the tested release. The release workflow has to establish the exact immutable release bytes and their provenance in its own right.',
    ],
    code: [
      {
        title: 'Promotion flow',
        language: 'text',
        code: `build exact commit
-> test and scan
-> publish immutable candidate
-> record coordinate/checksum/digest
-> deploy candidate to Development
-> integration/UAT/security evidence
-> Production approval
-> Nexus Pro staging/build promotion or controlled repository operation
-> verify destination checksum/digest
-> deploy same artifact`,
      },
    ],
    followUps: [
      'How do you verify the promoted bytes are identical?',
      'What does the promotion pipeline refuse to do?',
    ],
    tags: ['nexus', 'promotion', 'automation'],
  },
  {
    id: 'itv-myart-44',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'What common issues have you encountered while using Nexus Repository, and how would you troubleshoot them?',
    probing:
      'Whether you can troubleshoot the common Nexus failure modes from evidence rather than wiping caches or opening permissions.',
    answer: [
      '**Authentication and permission failures**',
      'Symptoms: `401` or `403`.',
      "I check the credential or token expiry, the auth realm, the anonymous-access policy, the user's role, the repository-view privilege, the content selector, and whether the request even hits the group or goes to a member repository directly.",
      '**Release cannot be uploaded** I check:',
      '- Snapshot sent to release repository or release sent to snapshot repository.\n- Disable-redeploy policy rejecting an existing coordinate.\n- Maven server ID mismatch.\n- CI user has read but not add/edit.\n- Invalid package metadata.',
      'I publish a new version instead of enabling overwrite for an immutable release.',
      '**Dependency exists remotely but Nexus returns not found**',
      "I check the proxy's remote URL, remote availability, routing rule, negative cache, metadata and component cache age, and the repository group's membership and order. I only invalidate a cache when I have evidence it's the cause. I do not repeatedly wipe every cache and hope.",
      '**Docker login/push fails**',
      'I verify Docker Bearer Token Realm, connector/subdomain, TLS/SNI, reverse-proxy headers, registry endpoint, repository write permission and image name.',
      '**npm scope resolves incorrectly**',
      'I check `.npmrc`, scoped-registry mapping, group order, authentication and whether publish is going to hosted rather than the read group.',
      '**Nexus becomes read-only or returns 5xx**',
      'I inspect writable status, disk/blob capacity, PostgreSQL health/latency, JVM pressure, file descriptors and Nexus logs. I stop unsafe cleanup/retry loops and protect evidence.',
      '**Slow builds:** I separate client, Nexus, proxy-remote, database, blob-storage and network latency. I look at cache hits, metadata checks, concurrency, JVM GC and storage I/O rather than assuming the public repository is slow.',
      '**Cleanup does not free disk**',
      'Cleanup may have soft-deleted components without compacting the blob store. I verify policy/task results, recovery-retention settings and schedule safe compaction after backup validation.',
      '**Artifact is present but cannot be downloaded through a group**',
      'I check group member order, group read/browse privilege, content selector and format compatibility. Direct member permission and group permission are separate.',
      '**General troubleshooting discipline**',
      'Then I reproduce the problem with the same client, on the same network, using a non-secret verbose mode. I compare Nexus and reverse-proxy logs and fix the root cause. I avoid deleting caches, opening up permissions to a wildcard, or restarting Nexus repeatedly without evidence that any of that will help.',
    ],
    code: [
      {
        title: 'Evidence to collect',
        language: 'text',
        code: `timestamp
pipeline/build ID
client and version
repository URL/type/format
artifact coordinate
HTTP status and request ID
Nexus version
recent configuration/deployment changes
server, database and blob-store health`,
      },
    ],
    followUps: [
      'A dependency exists upstream but Nexus returns 404 - what do you check?',
      'Why might cleanup not free disk?',
    ],
    tags: ['nexus', 'troubleshooting'],
  },
  {
    id: 'itv-myart-45',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Summarize how you use Nexus Repository in an Azure CI/CD flow.',
    probing:
      'Whether you can give a concise end-to-end summary of how you use Nexus in an Azure CI/CD flow.',
    answer: [
      'Sonatype Nexus Repository is a centralized repository manager. It hosts internal build artifacts, proxies public dependencies, and exposes multiple repositories through group endpoints.',
      'In my Azure CI/CD flow, Maven, npm, NuGet and Docker clients all download through a Nexus group. Only protected main or release pipelines publish versioned artifacts to hosted repositories. I keep snapshots separate from immutable releases, disable release redeployment, capture checksums and digests, and promote the same tested artifact instead of rebuilding it for each environment.',
      "Azure DevOps, Jenkins and GitHub Actions each use a dedicated least-privilege Nexus identity, and its credentials are protected through Azure Key Vault or the platform's own protected secret mechanism.",
      "For Production, I secure Nexus with TLS, private network access, enterprise authentication where it's available, RBAC and content selectors, logging, cleanup policies, capacity monitoring, and coordinated database and blob-store backups.",
      'Nexus Pro comes into play when the project needs capabilities such as supported HA, Azure Blob Store, enterprise SSO, staging and promotion, or repository import and export.',
      'When troubleshooting, I start with the HTTP status, the exact repository type and URL, and the artifact coordinate. From there I check authentication, privilege, release/snapshot and redeploy policies, client configuration, TLS and network, the database, blob storage, and the Nexus logs.',
    ],
    tags: ['nexus', 'summary', 'azure'],
  },
]
