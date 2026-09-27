import type { InterviewQuestion } from '../../../types'

/** Artifact repositories, registries, signing and Azure DevOps artifacts. */
export const myArtifactsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myart-1',
    level: 'basic',
    kind: 'open',
    prompt:
      'What is an artifact repository, how is it different from source control and pipeline artifacts, and which one do you pick?',
    probing:
      'Whether you can define an artifact repository and separate it from source control, CI and pipeline artifacts.',
    answer: [
      "An artifact repository stores, versions, and distributes the outputs of a software build. Once a version is published, it doesn't change. It is different from:",
      '- **Source control:** Stores source code and change history.\n- **CI/CD system:** Builds, tests, approves and deploys software.\n- **Pipeline artifact:** Transfers files between jobs/stages or retains output from a particular pipeline run.\n- **Package repository:** Provides long-lived, package-manager-native storage and version resolution.\n- **Container registry:** Stores OCI/container images and manifests.',
    ],
    code: [
      {
        title: 'Selection rule',
        language: 'text',
        code: `Azure DevOps-native package feeds -> Azure Artifacts
Azure container images            -> Azure Container Registry
Multi-platform universal repo     -> JFrog Artifactory or Nexus Repository
GitHub-native packages/images     -> GitHub Packages`,
      },
    ],
    tags: ['artifact repository', 'basics'],
  },
  {
    id: 'itv-myart-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When would you choose Azure Artifacts, and how do feed views and promotion work?',
    probing:
      'Whether you know Azure Artifacts formats, feeds, upstreams and views, and that containers belong in ACR.',
    answer: [
      'Azure Artifacts is usually the best choice when the organization is built around Azure DevOps and needs package feeds without running a separate repository platform. It supports:',
      '- NuGet.\n- npm.\n- Maven.\n- Python.\n- Cargo.\n- Universal Packages.',
      'Core capabilities include:',
      '- Organization- or project-scoped feeds.\n- Direct Azure Pipelines integration.\n- Upstream sources for approved public or internal package feeds.\n- Feed permissions.\n- Package versioning.\n- Views such as `@Local`, `@Prerelease` and `@Release`.\n- Package promotion between views.\n- Retention policies.',
      '**Example flow:** The application is built once. QA and Production receive that same unchanging version rather than a rebuilt ZIP.',
      'Feed views change package visibility; they do not create a different package binary. Packages are published to the base feed and can then be promoted.',
      'Azure Artifacts does not support demoting a package from a view, so promotion is treated as a controlled release decision.',
      '**Universal Package example**',
      '**When to select Azure Artifacts** Choose it when:',
      '- Azure Repos and Azure Pipelines are the primary delivery platform.\n- The required package formats are supported.\n- Teams want managed feeds with minimal separate infrastructure.\n- Azure DevOps permissions and project organization match the governance model.\n- The organization does not need the broader repository formats or cross-platform repository capabilities of Artifactory or Nexus.',
      '**Important container distinction**',
      'For containerized applications, use **Azure Container Registry (ACR)** rather than Azure Artifacts:',
      'ACR provides container/OCI-specific storage, manifests, tags, digests and AKS integration.',
    ],
    code: [
      {
        title: 'Build once, promote the same Universal Package',
        language: 'text',
        code: `source code
-> Azure Pipeline build and tests
-> create application.zip
-> publish application.zip as Universal Package version 2.5.1
-> deploy 2.5.1 to Development
-> promote the same 2.5.1 to the approved feed view
-> deploy the same package version to QA and Production`,
      },
      {
        title: 'Publish a Universal Package',
        language: 'bash',
        code: `az artifacts universal publish \\
  --organization https://dev.azure.com/<organization> \\
  --project <project> \\
  --scope project \\
  --feed application-packages \\
  --name orders-application \\
  --version 2.5.1 \\
  --path ./package`,
      },
      {
        title: 'Packages vs container images',
        language: 'text',
        code: `JAR, npm, NuGet or Universal Package -> Azure Artifacts
Docker/OCI image                     -> Azure Container Registry`,
      },
    ],
    tags: ['azure artifacts', 'feeds', 'views'],
  },
  {
    id: 'itv-myart-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When would you choose JFrog Artifactory, and what repository types does it offer?',
    probing:
      'Whether you know Artifactory repository types and when a large enterprise would choose it.',
    answer: [
      'JFrog Artifactory is a widely recognized enterprise universal repository manager. It is useful when a large organization has many technologies, delivery platforms, teams and locations.',
      'JFrog documents a broad set of integrated package types and repository capabilities. Common formats include:',
      '- Docker/OCI images.\n- Helm charts.\n- Maven and Gradle packages.\n- npm packages.\n- NuGet packages.\n- PyPI packages.\n- Generic ZIP, TAR, JAR and binary files.',
      'Repository types include:',
      '- **Local:** Stores internally produced artifacts.\n- **Remote:** Proxies and caches an external repository.\n- **Virtual:** Aggregates compatible local and remote repositories behind one client URL.\n- **Federated:** Synchronizes content and metadata across multiple Artifactory deployments, following whichever topology is supported.',
      '**When to select JFrog Artifactory** Choose it when:',
      '- The enterprise uses many package technologies.\n- Teams operate across multiple CI/CD platforms or clouds.\n- One central artifact platform is required across business units.\n- Repository federation/multi-site patterns are important.\n- Advanced metadata, promotion, traceability and security-platform integration are required.\n- The organization can support the licensing and operational model.',
      '**Strong interview answer**',
      "For a large enterprise with multiple technologies and delivery platforms, I would consider JFrog Artifactory. It gives you one central repository for many artifact formats, both hosted and proxied dependencies, unified client endpoints, metadata, and traceability and security integration. I'd still check licensing, supported formats, availability requirements, and operational cost against Nexus and managed cloud alternatives before deciding.",
      "Supporting many formats doesn't automatically make Artifactory the right choice. The decision also has to weigh scale, team skills, high availability, disaster recovery, security, support, and total cost.",
    ],
    code: [
      {
        title: 'Local, remote and virtual Maven repositories',
        language: 'text',
        code: `maven-local
maven-snapshots-local
maven-central-remote
        \\   |   /
      maven-virtual
           |
  developers and CI systems`,
      },
    ],
    tags: ['jfrog artifactory'],
  },
  {
    id: 'itv-myart-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When would you choose Sonatype Nexus Repository?',
    probing:
      'Whether you know Nexus formats, hosted/proxy/group types and when it is the right choice.',
    answer: [
      'Sonatype Nexus Repository is a popular universal repository manager and a common alternative to JFrog Artifactory. Current Sonatype documentation provides Community and Professional editions and supports a broad set of repository formats.',
      'Supported formats include:',
      '- Docker/OCI.\n- Maven.\n- Helm.\n- npm.\n- NuGet.\n- PyPI.\n- Yum and Apt.\n- Rust/Cargo.\n- Conan.\n- Ansible.\n- Go.\n- Raw/generic files.\n- Additional language and operating-system package formats.',
      'The exact hosted, proxy and group capabilities depend on the format and product version.',
      'Nexus works with Azure DevOps, Jenkins, GitHub Actions, GitLab CI, Bitbucket-based workflows and other CI/CD systems through native package clients, plugins and REST APIs.',
      '**Nexus repository types**',
      '- **Hosted:** Stores internal packages and approved uploaded content.\n- **Proxy:** Caches content retrieved from an external repository.\n- **Group:** Combines compatible hosted, proxy and group repositories behind one endpoint.',
      'Developers normally download through `maven-public`; authorized CI pipelines publish to the relevant hosted repository.',
      '**When to select Nexus Repository** Choose it when:',
      "- The organization needs a self-hosted repository manager.\n- Java, Maven and related package ecosystems are heavily used.\n- A central proxy/cache for public dependencies is required.\n- The organization wants an alternative to JFrog.\n- Community Edition meets a smaller deployment's needs.\n- Professional capabilities such as supported HA, staging/build promotion, enterprise SSO, repository import/export or Azure Blob Store are required and licensed.",
      '**Strong interview answer**',
      'Nexus Repository is a centralized repository manager. It hosts internal artifacts, proxies external dependencies, and exposes repository groups through stable URLs. I typically use hosted repositories for organization-owned packages, proxy repositories for public dependencies, and group repositories for developer consumption. CI publishes versions that never change afterward, and downstream environments promote and deploy that same checksum or digest.',
      "Don't confuse Nexus Repository with the separately licensed Sonatype supply-chain products. Check vulnerability policy, isolation, and lifecycle capabilities against the actual Nexus/Sonatype licenses in use, not against what the product line as a whole can do.",
    ],
    code: [
      {
        title: 'Hosted, proxy and group Maven repositories',
        language: 'text',
        code: `maven-releases hosted
maven-snapshots hosted
maven-central-proxy
        \\   |   /
      maven-public group`,
      },
    ],
    tags: ['nexus', 'repository manager'],
  },
  {
    id: 'itv-myart-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When would you choose GitHub Packages?',
    probing:
      'Whether you know when GitHub Packages fits and where a universal repository manager is better.',
    answer: [
      'GitHub Packages is a good choice when the development workflow is already centered on GitHub repositories and GitHub Actions.',
      'Common package registries include:',
      '- npm.\n- Maven.\n- Gradle.\n- NuGet.\n- RubyGems.\n- Container/OCI packages through GitHub Container Registry.',
      'Packages can be associated with a repository, user or organization depending on the registry and permission model. Some package types inherit repository permissions, while others support more detailed package permissions.',
      '**When to select GitHub Packages** Choose it when:',
      '- Source code is hosted in GitHub.\n- GitHub Actions is the primary CI/CD platform.\n- Packages should be closely associated with repositories or organizations.\n- The required package formats are supported.\n- The team wants fewer external platforms.\n- GitHub permissions, billing, retention and networking meet enterprise requirements.',
      'GitHub Packages is less suitable when the organization needs a broad universal repository manager, extensive proxy/group behavior across many ecosystems, or repository services shared equally across several unrelated source-control platforms.',
    ],
    code: [
      {
        title: 'GitHub-native package flow',
        language: 'text',
        code: `GitHub repository
-> pull-request checks
-> GitHub Actions build/test/scan
-> publish versioned package or container digest
-> protected GitHub Environment approval
-> deploy the same package/digest`,
      },
    ],
    tags: ['github packages'],
  },
  {
    id: 'itv-myart-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Compare Azure Artifacts, JFrog Artifactory, Nexus Repository and GitHub Packages.',
    probing:
      'Whether you can compare the four main options on fit, proxying, containers and cross-CI use.',
    answer: [
      '- **Best fit**: Azure Artifacts: Azure DevOps-centric teams; JFrog Artifactory: Large multi-technology enterprise; Nexus Repository: Self-hosted/universal repository, strong Maven use; GitHub Packages: GitHub-centric teams\n- **Managed option**: Azure Artifacts: Azure DevOps service; JFrog Artifactory: JFrog cloud option; Nexus Repository: Nexus Repository Cloud option; self-hosting common; GitHub Packages: GitHub service\n- **Internal packages**: Azure Artifacts: Yes; JFrog Artifactory: Yes; Nexus Repository: Yes; GitHub Packages: Yes\n- **External dependency proxy**: Azure Artifacts: Upstream sources; JFrog Artifactory: Remote repositories; Nexus Repository: Proxy repositories; GitHub Packages: More limited than a universal repository manager\n- **Unified endpoint**: Azure Artifacts: Feed/upstream model; JFrog Artifactory: Virtual repository; Nexus Repository: Group repository; GitHub Packages: Registry/package endpoint model\n- **Generic binaries**: Azure Artifacts: Universal Packages; JFrog Artifactory: Generic repository; Nexus Repository: Raw repository; GitHub Packages: Release assets may be a separate GitHub feature\n- **Containers**: Azure Artifacts: Use ACR for Azure design; JFrog Artifactory: Supported; Nexus Repository: Supported; GitHub Packages: GitHub Container Registry\n- **Cross-CI/CD use**: Azure Artifacts: Possible, Azure-native; JFrog Artifactory: Strong; Nexus Repository: Strong; GitHub Packages: Best with GitHub\n- **Self-hosted repository**: Azure Artifacts: Azure DevOps Server scenarios vary; JFrog Artifactory: Available; Nexus Repository: Available; GitHub Packages: GitHub Enterprise capabilities vary\n- **Enterprise HA/promotion**: Azure Artifacts: Managed service behavior; JFrog Artifactory: Licensed capability; Nexus Repository: Primarily Professional capabilities; GitHub Packages: Managed platform/environment workflow',
      'Always verify the current edition, supported package format, repository type, retention, geographic availability and license before selecting a product.',
    ],
    tags: ['artifact repository', 'comparison'],
  },
  {
    id: 'itv-myart-7',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the package promotion principle?',
    probing:
      'Whether you know promotion changes visibility or status and must never rebuild the package.',
    answer: [
      'The selected product may call the mechanism a feed view, staging, promotion, release repository or another term. The design principle remains:',
      'Promotion must never rebuild the package. For containers, promotion and deployment should preserve the same OCI digest all the way through.',
    ],
    code: [
      {
        title: 'Promotion principle',
        language: 'text',
        code: `build once
-> assign a version that will not change
-> test and scan
-> publish once
-> record checksum/digest
-> promote visibility/status
-> deploy the same bytes to every environment`,
      },
    ],
    tags: ['promotion', 'immutability'],
  },
  {
    id: 'itv-myart-8',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you select an artifact repository for an organization? Give examples.',
    probing:
      'Whether you select a repository from the technology and operating model, with concrete examples.',
    answer: [
      "I select an artifact repository from the organization's technology and operating model rather than choosing one product for every case.",
      'For an Azure DevOps-focused organization, I use Azure Artifacts for supported package feeds and Universal Packages, while container images go to Azure Container Registry. Azure Artifact views support controlled package visibility and promotion.',
      'For a large multi-language and multi-CI/CD enterprise, I evaluate JFrog Artifactory or Sonatype Nexus Repository. Artifactory offers a broad universal-repository ecosystem with local, remote, virtual and federated models.',
      'Nexus provides hosted, proxy and group repositories and is a strong choice for self-hosting, Maven-heavy environments and centralized dependency caching.',
      'When source code and automation are primarily in GitHub, GitHub Packages can reduce the number of external tools for supported formats and container packages.',
      "Whatever tool is involved, the approach stays the same: build once, publish a version that won't change, record its checksum or digest, promote that same artifact through every environment, protect publishing with only the permissions people actually need, and keep backup and recovery procedures tested.",
      '**Azure DevOps Java project**',
      'This minimizes external tooling and integrates with Azure permissions and pipelines.',
      '**Large multi-language enterprise**',
      'The decision between Artifactory and Nexus depends on formats, enterprise identity, HA/DR, multi-site requirements, promotion, security integrations, support and cost.',
      '**GitHub-native product**',
    ],
    code: [
      {
        title: 'Azure DevOps Java project',
        language: 'text',
        code: `Source: Azure Repos
CI/CD: Azure Pipelines
Java packages: Azure Artifacts Maven feed
Container images: Azure Container Registry
Deployment: Helm to AKS`,
      },
      {
        title: 'Large multi-language enterprise',
        language: 'text',
        code: `Source: multiple Git platforms
CI/CD: Azure DevOps + Jenkins + GitHub Actions + GitLab CI
Packages: Maven + npm + NuGet + PyPI + Helm + containers
Repository: JFrog Artifactory or Nexus Repository`,
      },
      {
        title: 'GitHub-native product',
        language: 'text',
        code: `Source: GitHub
CI/CD: GitHub Actions
Packages: GitHub Packages
Containers: GitHub Container Registry or ACR when Azure deployment policy requires it
Deployment: Protected GitHub Environment to Azure/AKS`,
      },
    ],
    followUps: [
      'What would push you from Nexus to Artifactory?',
      'Where do container images go in an Azure DevOps shop, and why?',
    ],
    tags: ['artifact repository', 'selection'],
  },
  {
    id: 'itv-myart-9',
    level: 'advanced',
    kind: 'open',
    prompt: 'Which container registry should you trust for production images?',
    probing:
      'Whether you know trust comes from controls, provenance and promotion, not from a registry being private or popular.',
    answer: [
      'I trust an organization-approved registry, not an image just because it is public or popular.',
      "The registry needs strong identity controls and repositories locked down to the minimum access people actually need. It also needs TLS and encryption, tags that can't be changed after creation (or deployment by digest instead of tag), vulnerability scanning, audit logs, retention and recovery, replication and availability, and integration with signing, SBOM, and admission policy.",
      'Examples include ECR, ACR, GCR/Artifact Registry, JFrog Artifactory, Nexus, Harbor, or another managed internal service.',
      "Base images come from allowlisted publishers. They're mirrored internally, pinned by digest, scanned, and rebuilt on a schedule the team owns. CI authenticates with a short-lived identity, signs the resulting digest, and only the release workflow can write to production repositories.",
      'Kubernetes or the runtime checks that the image comes from an approved registry, verifies its signature and provenance (proof of where it came from and how it was built), and checks policy before deployment.',
      "I test pull behavior during a registry or availability-zone failure, and monitor auth failures, scan findings, replication lag, storage, and unusual downloads. A private registry alone doesn't guarantee trust. Provenance and controlled promotion into production are what actually establish it.",
    ],
    followUps: [
      'How do you mirror and pin public base images?',
      'What does admission control check before running an image?',
    ],
    tags: ['container registry', 'trust'],
  },
  {
    id: 'itv-myart-10',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you sign software artifacts and verify them before deployment?',
    probing:
      'Whether you sign digests with protected or keyless identity and verify signature, issuer and attestations at deploy.',
    answer: [
      'I sign the digest after the build and security checks pass, using a protected key or a keyless workload identity tied to the CI workflow. Containers and OCI Helm charts can use Cosign. Classic Helm charts can use provenance signatures. Packages can use whatever signing mechanism is native to that ecosystem.',
      'The signature and provenance record the source commit, the builder or workflow that produced it, the artifact digest, and any attestations such as SBOM or test results.',
      "Deployment policy checks the digest, the signature's identity and issuer, the expected repository or workflow, and any required attestations before admitting or promoting the artifact. Keys have owners, rotation, revocation, and audit trails. CI jobs never get long-lived exported private keys.",
      'I also test offline or recovery-mode verification, so it still works when something else is down.',
      'Signing proves origin and integrity, not quality. Code review, tests, scanning, policy checks, and runtime controls are still needed on top of it.',
      'If a key or workflow is compromised, I revoke trust, find every digest signed with it, rebuild from a trusted pipeline, and block those old artifacts from deployment.',
    ],
    followUps: [
      'What is keyless signing and what identity does it rely on?',
      'What do you do when a signing key is compromised?',
    ],
    tags: ['signing', 'cosign', 'provenance'],
  },
  {
    id: 'itv-myart-11',
    level: 'basic',
    kind: 'open',
    prompt: 'What are artifacts in Azure DevOps, and how do you publish and consume them?',
    probing:
      'Whether you know build vs pipeline artifacts vs Azure Artifacts feeds and publish once, download the same artifact.',
    answer: [
      'In Azure DevOps, artifacts refer to the files or packages produced as a result of a build or release pipeline. They can include compiled code, binaries, libraries, configuration files, or any other output that needs to be stored and shared for deployment or further processing.',
      'Azure DevOps provides a built-in artifact management system that allows teams to publish, store, and consume artifacts efficiently.',
      'Artifacts in Azure DevOps are typically managed through the following features:',
      '1. **Build Artifacts**: During a build pipeline, you can define tasks to publish artifacts. These artifacts are then stored in the Azure DevOps server and can be downloaded or used in subsequent stages of the pipeline.\n2. **Release Artifacts**: In a release pipeline, you can consume artifacts produced by build pipelines. These artifacts can be deployed to various environments as part of the release process.\n3. **Artifact Feeds**: Azure Artifacts is a service within Azure DevOps that allows you to create and manage package feeds. You can publish and consume packages (like NuGet, npm, Maven, etc.) within your organization, making it easier to share code and dependencies across teams.\n4. **Retention Policies**: Azure DevOps allows you to set retention policies for artifacts, helping you manage storage by automatically deleting old or unused artifacts based on defined criteria.',
      'To publish artifacts in a build pipeline, you can use the **"Publish Build Artifacts"** task. Here\'s an example of how to publish artifacts in a YAML pipeline:',
      'In this example, after building a Maven project, the build artifacts are published to the Azure DevOps server under the name `drop`.',
      'Overall, Azure DevOps provides a robust system for managing artifacts, enabling teams to streamline their CI/CD processes and ensure that the right files are available for deployment and distribution.',
      'The build stage creates a tested artifact once and publishes it with version, commit SHA, checksum, and retention. Deployment stages download that exact artifact rather than rebuilding.',
      'Pipeline artifacts suit build outputs; Azure Artifacts feeds host NuGet, npm, Maven, Python, and Universal Packages. Container images go to a registry such as ACR.',
      'I restrict write permissions, scan/sign artifacts, avoid secrets, and clean by retention policy. During investigation I verify artifact ID/digest and that the deployed environment used the same version tested in staging.',
    ],
    code: [
      {
        title: 'Publish build artifacts after a Maven build',
        language: 'yaml',
        code: `trigger:
  - main
pool:
  vmImage: 'ubuntu-latest'
steps:
  - task: Maven@3
    inputs:
      mavenPomFile: 'pom.xml'
      goals: 'package'
  - task: PublishBuildArtifacts@1
    inputs:
      PathtoPublish: '$(Build.ArtifactStagingDirectory)'
      ArtifactName: 'drop'
      publishLocation: 'Container'`,
      },
      {
        title: 'Publish and download a pipeline artifact',
        language: 'yaml',
        code: `- publish: $(Build.ArtifactStagingDirectory)
  artifact: application

- download: current
  artifact: application`,
      },
    ],
    tags: ['azure devops', 'artifacts'],
  },
  {
    id: 'itv-myart-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle large artifacts efficiently in pipelines and in Azure Pipelines?',
    probing:
      'Whether you shrink, split, cache and version large artifacts and use the right storage service.',
    answer: [
      'Handling large artifacts efficiently in pipelines requires a combination of strategies to optimize storage, transfer, and processing. Here are some best practices to manage large artifacts effectively:',
      '1. **Use Artifact Repositories**: Instead of storing large artifacts directly in the pipeline, use dedicated artifact repositories like Azure Artifacts, Nexus, or Artifactory. These repositories are optimized for storing and managing large files and packages.\n2. **Compress Artifacts**: Before publishing artifacts, compress them using formats like ZIP or TAR. This reduces the size of the files being transferred and stored, leading to faster uploads and downloads.\n3. **Incremental Builds**: Implement incremental builds to avoid rebuilding and republishing unchanged artifacts. This can significantly reduce the size of artifacts and the time taken to process them.\n4. **Use Caching**: Leverage caching mechanisms to store frequently used dependencies and artifacts. This can speed up build times and reduce the need to download large files repeatedly.\n5. **Split Artifacts**: If possible, split large artifacts into smaller, more manageable pieces. This allows for parallel processing and reduces the impact of failures during transfers.\n6. **Optimize Network Transfers**: Use efficient protocols for transferring large files, such as HTTP/2 or FTP, and consider using Content Delivery Networks (CDNs) to distribute artifacts closer to the deployment targets.\n7. **Set Retention Policies**: Implement retention policies to automatically delete old or unused artifacts. This helps manage storage costs and keeps the artifact repository clean.\n8. **Monitor and Analyze**: Regularly monitor artifact sizes and transfer times. Use this data to identify bottlenecks and optimize the pipeline accordingly.\n9. **Use Streaming**: For very large artifacts, consider using streaming techniques to process data in chunks rather than loading the entire artifact into memory at once.\n10. **Parallel Downloads**: If your pipeline supports it, implement parallel downloads for large artifacts to speed up the retrieval process.',
      'By following these strategies, you can efficiently manage large artifacts in your pipelines, ensuring smooth and reliable CI/CD processes.',
      'I first work out why the artifact is large and whether every file in it is actually needed for deployment. I remove build caches and debug output, use package or container registries instead of raw file transfer, compress suitable content, split independent packages, and cache dependencies incrementally rather than rebuilding the whole artifact.',
      "Artifacts get explicit retention rules and versions that don't change once published. I place agents and storage close to consumers where possible, and I only use parallel downloads if the tooling supports it and it actually helps.",
      'I monitor upload/download time, size trend, storage cost, and deployment time.',
      'For very large datasets or VM images, I use the appropriate storage/image service and pass a versioned reference through the pipeline rather than transferring it as a normal pipeline artifact.',
    ],
    tags: ['large artifacts', 'performance'],
  },
  {
    id: 'itv-myart-13',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure CI/CD artifact storage?',
    probing:
      'Whether you secure artifact storage with RBAC, signing, encryption and verification at deployment.',
    answer: [
      'Store in Nexus/Artifactory → Enable RBAC → Use signed artifacts → Encrypt storage.',
      '**Detailed interview approach:** I protect the whole path from source to production. That means branch protection and code review, pinned dependencies, actions, and plugins, isolated ephemeral runners, and short-lived identities scoped to the minimum access needed.',
      'On top of that I run SAST, dependency, secret, IaC, and container scans, generate an SBOM, sign the provenance record and the artifacts themselves, use protected registries, and verify everything again at deployment admission.',
      'Scan findings get an agreed severity and SLA, plus a time-limited exception process, so the gates are strict but still usable day to day.',
      'If I suspect compromise, I stop promotion, revoke runner and signing credentials, isolate the affected artifacts, preserve audit evidence, rebuild from a trusted runner and source, and verify signatures again before redeploying.',
      "Regular patching, egress restrictions, audit log retention, and recovery drills cover the gaps that scanners alone can't catch.",
    ],
    tags: ['artifact storage', 'security'],
  },
  {
    id: 'itv-myart-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Docker registry in production?',
    probing:
      'Whether you secure a registry with TLS, auth, signed images and scoped IAM, plus runtime hardening.',
    answer: [
      'Enable HTTPS & authentication → Use signed images (Cosign) → Restrict access via IAM.',
      '**Detailed interview approach:** I look at the image, the runtime configuration, and the host separately. Builds use multi-stage Dockerfiles, small pinned trusted base images, a `.dockerignore` file, dependency layers ordered for caching, and non-root runtime users.',
      "CI scans the dependencies and the image, generates an SBOM, signs the digest so it can't be swapped later, and pushes it over TLS to a registry with tightly scoped write access. Deployment then verifies that same digest before running it.",
      'At runtime I drop unnecessary capabilities, use seccomp, AppArmor, or SELinux, run with a read-only filesystem, set resource limits, avoid exposing the privileged Docker socket, and restrict networking.',
      'If startup is slow or a push fails, I measure layer size and cache hits, check registry DNS, auth, and TLS, and check disk and application initialization, instead of just retrying blindly. Then I rebuild from patched base images and re-verify functionality and security findings.',
    ],
    tags: ['docker registry', 'security'],
  },
  {
    id: 'itv-myart-15',
    level: 'basic',
    kind: 'scenario',
    prompt: 'How do you troubleshoot failed Docker image push to registry?',
    probing:
      'Whether you check credentials, image name, repository and connectivity when a push fails.',
    answer: [
      'Check registry credentials → Validate image name/tag → Ensure repository exists → Retry with correct login.',
      '**Detailed interview approach:** I look at the image, the runtime configuration, and the host separately. Builds use multi-stage Dockerfiles, small pinned trusted base images, a `.dockerignore` file, dependency layers ordered for caching, and non-root runtime users.',
      "CI scans the dependencies and the image, generates an SBOM, signs the digest so it can't be swapped later, and pushes it over TLS to a registry with tightly scoped write access. Deployment then verifies that same digest before running it.",
      'At runtime I drop unnecessary capabilities, use seccomp, AppArmor, or SELinux, run with a read-only filesystem, set resource limits, avoid exposing the privileged Docker socket, and restrict networking.',
      'If startup is slow or a push fails, I measure layer size and cache hits, check registry DNS, auth, and TLS, and check disk and application initialization, instead of just retrying blindly. Then I rebuild from patched base images and re-verify functionality and security findings.',
    ],
    tags: ['docker push', 'troubleshooting'],
  },
]
