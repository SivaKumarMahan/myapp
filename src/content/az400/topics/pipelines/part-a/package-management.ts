import type { Topic } from '../../../../types'

export const packageManagement: Topic = {
  id: 'az4-package-management',
  title: 'Package management: Azure Artifacts, GitHub Packages and versioning',
  domainId: 'az4-pipelines',
  difficulty: 'beginner',
  estimatedMinutes: 30,
  order: 1,
  tags: [
    'azure-artifacts',
    'feeds',
    'upstream-sources',
    'views',
    'github-packages',
    'semver',
    'calver',
    'dependencies',
  ],
  oneLiner:
    'Publish the libraries your teams share to a private feed, pull public packages through it, and version everything so a build is reproducible.',
  explanation: [
    'A **package** is a versioned, immutable bundle of built code that another project consumes as a dependency: a NuGet `.nupkg`, an npm tarball, a Python wheel, a Maven `.jar`. Package management is how an organization shares that code without copying source between repositories.',
    '**Azure Artifacts** hosts private **feeds** inside Azure DevOps. One feed can hold several package types at once - NuGet, npm, Maven, Gradle, Python, Cargo and **Universal Packages** (arbitrary files such as a zipped CLI or a machine-learning model). A feed is either **organization-scoped** or **project-scoped**; project-scoped is the default for new feeds and inherits the project visibility.',
    '**Upstream sources** let a feed proxy other registries - nuget.org, npmjs.com, PyPI, Maven Central, crates.io, or another Azure Artifacts feed. Developers point their tools at a single feed; when a package is not found locally, the feed fetches it from the upstream and **saves a copy**, so later builds still work if the public registry is down or the version is unpublished.',
    '**Views** (`@Local`, `@Prerelease`, `@Release` by default) are filtered windows onto a feed. You **promote** a package version to a view once it has passed testing, and consumers who should only see vetted code point at `feed@Release`.',
    '**GitHub Packages** is GitHub’s equivalent: npm, NuGet, Maven, Gradle, RubyGems and container images (`ghcr.io`), with permissions tied to the repository or organization and publishing authenticated by the workflow `GITHUB_TOKEN`.',
    'Versioning ties it together. **Semantic Versioning** (SemVer, `MAJOR.MINOR.PATCH`) tells a consumer whether an upgrade can break them; **Calendar Versioning** (CalVer, for example `2026.09.1`) tells them when it shipped. Package versions in a feed are **immutable** - once `1.4.0` is published it can never be overwritten, even after deletion.',
  ],
  whyItMatters: [
    'The AZ-400 skills outline has a whole section on designing a package management strategy: choosing Azure Artifacts vs GitHub Packages, configuring upstream sources, using views for release quality, and choosing a versioning scheme. Expect scenario questions that hinge on one word - "promote", "upstream", "immutable".',
    'Upstream sources are also a security control. A single feed with upstreams gives you one place to audit what came from the internet, and Azure Artifacts protects against **dependency confusion** (someone publishing a public package with your internal package name) by blocking externally sourced versions of a package that already exists locally unless you explicitly allow them.',
    'In production work, reproducible builds depend on this. If your build pulls `latest` from the public internet, the same commit can produce different binaries on Monday and Tuesday. Pinned versions, lock files and a caching feed make the build a function of the commit.',
  ],
  howItWorks: [
    'You create a feed in **Artifacts** in the Azure DevOps portal (or via the REST API). You choose its scope and whether to include public upstream sources at creation time.',
    'Feed permissions are roles: **Feed Owner**, **Feed Publisher (Contributor)**, **Feed and Upstream Reader (Collaborator)** - who can also cause packages to be saved from upstreams - and **Feed Reader**. A pipeline publishes as the build service identity (`<Project> Build Service (<org>)` or `Project Collection Build Service`), so that identity needs Feed Publisher on the feed.',
    'Clients authenticate with credential providers. In pipelines you add an authenticate task (`NuGetAuthenticate@1`, `npmAuthenticate@0`, `PipAuthenticate@1`, `TwineAuthenticate@1`, `MavenAuthenticate@0`) that injects a short-lived token for the job - never a checked-in PAT.',
    'When a restore asks for a package the feed does not hold, the feed walks its upstream sources **in the configured order**, returns the first match, and saves the version into the feed. Saved packages show their source, and they are retained even if later removed upstream.',
    'After a version passes quality checks you **promote** it to `@Prerelease` or `@Release`. Promotion does not copy or change the package; it adds the version to the view. Consumers use a view-qualified source URL such as `.../_packaging/shared@Release/nuget/v3/index.json`.',
    'Retention policies cap how many versions of each package are kept (versions promoted to a view or recently downloaded are kept). Azure Artifacts includes a free storage allowance per organization; beyond that, storage is billed.',
    'On GitHub, a workflow publishes with `GITHUB_TOKEN` and `permissions: packages: write`. Package visibility and access can be inherited from the linked repository or managed per package.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'How a restore flows through a feed with upstreams',
      caption:
        'Developers and pipelines only ever talk to the feed. The feed decides what comes from the internet and keeps a copy.',
      nodes: [
        {
          label: 'Build restores a dependency',
          detail: 'dotnet restore or npm ci against the feed URL',
          tone: 'accent',
        },
        {
          label: 'Feed checks its own packages',
          detail: 'Locally published and previously saved versions',
          arrowLabel: 'authenticated request',
        },
        {
          label: 'Walks upstream sources in order',
          detail: 'Another feed first, then nuget.org or npmjs',
          arrowLabel: 'not found locally',
          branch: {
            label: 'Internal name already exists',
            detail: 'External versions blocked by default',
            tone: 'warning',
          },
        },
        {
          label: 'Version saved into the feed',
          detail: 'Future restores served from the copy',
          tone: 'success',
        },
        {
          label: 'Build gets the package',
          detail: 'Same bytes every time for that version',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Choosing a versioning scheme',
      caption:
        'SemVer communicates compatibility, CalVer communicates time. Libraries almost always want SemVer.',
      question: 'What must the version number tell a consumer?',
      branches: [
        {
          condition: 'whether upgrading can break their code',
          result: 'Semantic Versioning',
          detail: 'MAJOR.MINOR.PATCH, prerelease tags like -beta.1',
          tone: 'accent',
        },
        {
          condition: 'when it shipped, on a regular cadence',
          result: 'Calendar Versioning',
          detail: 'For example 2026.09.1 for apps and tools',
        },
        {
          condition: 'exactly which build produced it',
          result: 'SemVer plus build metadata',
          detail: 'For example 1.4.0+20260927.3',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Azure Artifacts feed',
      purpose:
        'A private package repository inside an Azure DevOps organization. Holds several package types, has its own permissions, views, upstreams and retention.',
      fields: [
        {
          path: 'scope',
          meaning:
            'Organization or project. Project-scoped feeds are the default and follow the project visibility.',
          required: true,
        },
        {
          path: 'permissions',
          meaning:
            'Feed Owner, Feed Publisher (Contributor), Feed and Upstream Reader (Collaborator), Feed Reader.',
        },
        {
          path: 'retention.maxVersionsPerPackage',
          meaning:
            'How many versions of each package to keep before older, unpromoted ones are removed.',
        },
        {
          path: 'upstreamSources[]',
          meaning: 'Ordered list of public registries or other feeds to proxy and cache.',
        },
      ],
    },
    {
      kind: 'Feed view',
      purpose:
        'A filtered, promotable subset of a feed that signals quality. Consumers can point at a view instead of the whole feed.',
      fields: [
        {
          path: '@Local',
          meaning: 'Everything published to or saved into the feed. Default view.',
        },
        { path: '@Prerelease', meaning: 'Versions promoted as ready for early adopters.' },
        { path: '@Release', meaning: 'Versions promoted as production-ready.' },
      ],
    },
    {
      kind: 'Upstream source',
      purpose:
        'A registry the feed consults when a package is not found locally. Versions it returns are saved into the feed.',
      fields: [
        {
          path: 'protocol',
          meaning: 'NuGet, npm, Maven, PyPI, Cargo - each upstream serves one protocol.',
        },
        {
          path: 'order',
          meaning: 'Upstreams are searched in order; the first match wins.',
        },
        {
          path: 'allowExternalVersions',
          meaning:
            'Per-package setting that controls whether public versions may be pulled for a name that also exists internally.',
        },
      ],
    },
    {
      kind: 'Version string (SemVer 2.0)',
      purpose: 'The contract between a package author and its consumers.',
      fields: [
        { path: 'MAJOR', meaning: 'Incremented for breaking changes.', required: true },
        { path: 'MINOR', meaning: 'Backwards-compatible new functionality.', required: true },
        { path: 'PATCH', meaning: 'Backwards-compatible fixes.', required: true },
        {
          path: '-prerelease',
          meaning: 'Optional, for example -beta.2. Sorts lower than the release version.',
        },
        {
          path: '+build',
          meaning: 'Optional build metadata. Ignored when comparing precedence.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The morning npm went sideways',
    story: [
      'A retail company had forty services, each restoring directly from npmjs.com. One morning a transitive dependency published a broken patch release, and every build that ran `npm install` without a lock file picked it up. Half the pipelines went red and nobody had changed a line of code.',
      'The platform team created one organization-scoped feed, `shared`, with npmjs.com as an upstream, and changed every `.npmrc` to point at it. They made `npm ci` with a committed `package-lock.json` mandatory in pipeline templates.',
      'Internal libraries moved into the same feed with SemVer and a rule: a version reaches `@Release` only after the consuming services pass integration tests. Product teams consume `shared@Release`; the library team works against `@Local`.',
      'Six months later a public package the company depended on was unpublished by its author. Nothing broke - the feed had saved the version months earlier.',
    ],
  },
  yamlExamples: [
    {
      title: 'Azure Pipelines: pack, publish to a feed, then use it',
      language: 'yaml',
      explanation:
        'Versions are derived from the pipeline run so every build is unique and traceable. `NuGetAuthenticate@1` gives the job a short-lived credential; the build service identity must be a Feed Publisher.',
      code: `trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

variables:
  majorMinor: '2.3'
  packageVersion: '$(majorMinor).$(Build.BuildId)'

steps:
  - task: UseDotNet@2
    inputs:
      packageType: sdk
      version: 8.x

  - task: NuGetAuthenticate@1

  - script: dotnet restore --locked-mode
    displayName: Restore with lock file

  - script: dotnet pack src/Contoso.Core/Contoso.Core.csproj -c Release -o $(Build.ArtifactStagingDirectory) /p:PackageVersion=$(packageVersion)
    displayName: Pack $(packageVersion)

  - task: DotNetCoreCLI@2
    displayName: Push to Azure Artifacts
    inputs:
      command: push
      packagesToPush: $(Build.ArtifactStagingDirectory)/*.nupkg
      nuGetFeedType: internal
      publishVstsFeed: 'Contoso/shared'`,
    },
    {
      title: 'GitHub Actions: publish an npm package to GitHub Packages',
      language: 'yaml',
      explanation:
        '`setup-node` writes an `.npmrc` for the scope; the token comes from `GITHUB_TOKEN`, which needs `packages: write` for this job only.',
      code: `name: publish-package
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://npm.pkg.github.com
          scope: '@contoso'
      - run: npm ci
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: \${{ secrets.GITHUB_TOKEN }}`,
    },
    {
      title: 'Dependency ranges and a pinned lock file',
      language: 'json',
      explanation:
        'The caret range accepts compatible minor and patch updates; the tilde accepts only patches; the exact version accepts nothing new. The lock file (committed) is what actually makes the build reproducible.',
      code: `{
  "name": "@contoso/checkout-web",
  "version": "4.2.0",
  "dependencies": {
    "@contoso/design-system": "^3.1.0",
    "date-fns": "~3.6.0",
    "left-pad": "1.3.0"
  },
  "publishConfig": {
    "registry": "https://pkgs.dev.azure.com/contoso/_packaging/shared/npm/registry/"
  }
}`,
    },
  ],
  imperative: [
    {
      command:
        'az artifacts universal publish --organization https://dev.azure.com/<org> --project <project> --scope project --feed <feed> --name <package> --version 1.0.0 --path ./dist --description "CLI tool build"',
      what: 'Publishes a folder as a Universal Package - useful for binaries, scripts or models that are not NuGet or npm.',
      expected: 'JSON describing the published package, with the name and version.',
      placeholders: ['<org>', '<project>', '<feed>', '<package>'],
    },
    {
      command:
        'az artifacts universal download --organization https://dev.azure.com/<org> --project <project> --scope project --feed <feed> --name <package> --version "1.*" --path ./out',
      what: 'Downloads the highest version matching the wildcard into ./out.',
      expected: 'The package files appear in ./out.',
      placeholders: ['<org>', '<project>', '<feed>', '<package>'],
    },
    {
      command:
        'dotnet nuget add source https://pkgs.dev.azure.com/<org>/<project>/_packaging/<feed>/nuget/v3/index.json --name shared',
      what: 'Registers the feed as a NuGet source on a developer machine (authentication comes from the Azure Artifacts Credential Provider).',
      expected: 'Package source with Name: shared added successfully.',
      placeholders: ['<org>', '<project>', '<feed>'],
    },
    {
      command:
        'dotnet nuget push ./bin/Release/Contoso.Core.2.3.41.nupkg --source shared --api-key az',
      what: 'Pushes a package. The api-key value is a required dummy; the credential provider supplies the real token.',
      expected: 'Your package was pushed.',
    },
    {
      command: 'npm publish --registry https://npm.pkg.github.com',
      what: 'Publishes a scoped npm package to GitHub Packages from a machine or workflow that has a token with write:packages.',
      expected: '+ @contoso/design-system@3.2.0',
    },
  ],
  declarative: {
    steps: [
      'Create the feed once in the portal (Artifacts > Create feed) and decide scope and upstreams up front.',
      'Grant the pipeline build service identity Feed Publisher (Contributor) under Feed settings > Permissions.',
      'Commit a `nuget.config` or `.npmrc` that points at the feed (never with credentials) so developers and pipelines resolve through the same source.',
      'Add the authenticate task and derive the package version from the pipeline, so no two builds share a version.',
      'Add a later stage that promotes the version to `@Release` only after tests pass.',
    ],
    code: [
      {
        title: 'nuget.config pointing at one feed (upstreams do the rest)',
        language: 'text',
        explanation:
          '`clear` removes nuget.org so every restore goes through the feed, whose upstream proxies nuget.org and caches what it fetches.',
        code: `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="shared" value="https://pkgs.dev.azure.com/contoso/_packaging/shared/nuget/v3/index.json" />
  </packageSources>
</configuration>`,
      },
      {
        title: 'Publishing and downloading a Universal Package in YAML',
        language: 'yaml',
        code: `steps:
  - task: UniversalPackages@0
    displayName: Publish CLI build
    inputs:
      command: publish
      publishDirectory: $(Build.ArtifactStagingDirectory)/cli
      feedsToUsePublish: internal
      vstsFeedPublish: 'Contoso/shared'
      vstsFeedPackagePublish: contoso-cli
      versionOption: patch
      packagePublishDescription: 'Contoso CLI from build $(Build.BuildNumber)'

  - task: UniversalPackages@0
    displayName: Download it in another job
    inputs:
      command: download
      downloadDirectory: $(Pipeline.Workspace)/cli
      feedsToUse: internal
      vstsFeed: 'Contoso/shared'
      vstsFeedPackage: contoso-cli
      vstsPackageVersion: '*'`,
      },
    ],
  },
  verification: [
    {
      command:
        'az artifacts universal download --organization https://dev.azure.com/<org> --project <project> --scope project --feed <feed> --name <package> --version 1.0.0 --path ./check',
      what: 'Proves the published version is retrievable with the expected contents.',
      expected: 'Files in ./check match what you published.',
      placeholders: ['<org>', '<project>', '<feed>', '<package>'],
    },
    {
      command:
        'npm view @contoso/design-system versions --registry https://pkgs.dev.azure.com/<org>/_packaging/<feed>/npm/registry/',
      what: 'Lists the versions the feed serves for a package, including ones saved from upstream.',
      expected: "[ '3.1.0', '3.2.0' ]",
      placeholders: ['<org>', '<feed>'],
    },
    {
      command: 'dotnet nuget list source',
      what: 'Shows which sources a machine will restore from, and in what order.',
      expected: 'shared [Enabled] pointing at pkgs.dev.azure.com.',
    },
  ],
  troubleshooting: [
    {
      command: 'dotnet restore --verbosity detailed',
      what: 'A 401 or 403 during restore or push shows which source failed. A 403 on push usually means the build service identity is not a Feed Publisher.',
      expected:
        'Response status code does not indicate success: 403 (Forbidden) on the failing feed.',
    },
    {
      command: 'dotnet nuget push ./pkg.1.0.0.nupkg --source shared --api-key az',
      what: 'A 409 Conflict means that version already exists, or existed and was deleted - feed versions are immutable. Bump the version.',
      expected: 'Response status code does not indicate success: 409 (Conflict).',
    },
    {
      command: 'npm install --loglevel verbose',
      what: 'Shows which registry each package was fetched from; if a package is missing, check that the feed has the matching upstream source enabled.',
    },
  ],
  commonMistakes: [
    'Forgetting to give the build service identity Feed Publisher (Contributor), so the pipeline can restore but fails with 403 when pushing.',
    'Trying to overwrite or re-publish a version after deleting it. Versions in Azure Artifacts are immutable; publish a new version instead.',
    'Adding nuget.org or npmjs alongside the feed in the client config instead of as an upstream. You lose caching, auditing and dependency-confusion protection.',
    'Committing a PAT into `.npmrc` or `nuget.config`. Use the authenticate tasks in pipelines and the credential provider or `vsts-npm-auth` on developer machines.',
    'Floating dependency ranges with no lock file, so the same commit restores different versions on different days.',
    'Thinking promotion to a view copies or rebuilds the package. It only makes the existing version visible in that view.',
  ],
  examTips: [
    '"Cache packages from nuget.org / npmjs and keep them if they are removed" means **upstream sources**.',
    '"Only let consumers see packages that passed QA" means **feed views** and **promote**.',
    '"Share arbitrary files or binaries that are not NuGet/npm/Maven/Python" means **Universal Packages** (`az artifacts universal publish`).',
    'Pipeline authenticates to a feed with a task such as `NuGetAuthenticate@1` or `npmAuthenticate@0` - not a PAT stored in the repo.',
    'SemVer: breaking change bumps MAJOR, new feature bumps MINOR, fix bumps PATCH. Prerelease `1.0.0-beta` sorts before `1.0.0`.',
    'GitHub Packages publishing from Actions needs `permissions: packages: write` on the job.',
  ],
  summary: [
    'A feed is a private package repository; Azure Artifacts feeds hold several package types and are organization- or project-scoped.',
    'Upstream sources proxy public registries and other feeds and save copies, which makes builds resilient and auditable.',
    'Views (@Local, @Prerelease, @Release) plus promotion express release quality without republishing.',
    'Versions are immutable. SemVer signals compatibility, CalVer signals time, and lock files make restores reproducible.',
    'GitHub Packages is the GitHub-native option, authenticated in workflows by GITHUB_TOKEN with packages: write.',
  ],
  practice: [
    {
      id: 'az4-package-management-p1',
      level: 'beginner',
      prompt:
        'A team wants their pipelines to keep building even if a package they depend on is deleted from npmjs.com. What do you configure?',
      answer:
        'Point the builds at an Azure Artifacts feed that has npmjs.com as an upstream source. The feed saves each version it fetches, so it keeps serving that version even after it disappears upstream.',
    },
    {
      id: 'az4-package-management-p2',
      level: 'beginner',
      prompt:
        'Your library team publishes every CI build to a feed, but application teams must only consume tested versions. How do you model that?',
      answer:
        'Use feed views. Publish all builds to the feed (@Local), promote a version to @Release after it passes tests, and have application teams restore from the feed@Release URL.',
      explanation:
        'A second feed would also work but duplicates packages and permissions; views are the intended mechanism.',
    },
    {
      id: 'az4-package-management-p3',
      level: 'intermediate',
      prompt:
        'A pipeline restores fine from the feed but fails with 403 Forbidden on `dotnet nuget push`. What is the most likely cause?',
      answer:
        'The identity the pipeline runs as (the project or project collection build service) has reader access but not Feed Publisher (Contributor) on the feed. Grant it that role in feed permissions.',
    },
    {
      id: 'az4-package-management-p4',
      level: 'intermediate',
      prompt:
        'You fixed a bug in version 2.1.0 of a package, deleted 2.1.0 from the feed and tried to push the fixed build as 2.1.0 again. Why does it fail and what should you do?',
      answer:
        'Package versions in Azure Artifacts are immutable, so a deleted version number cannot be reused. Publish the fix as 2.1.1 (a PATCH bump under SemVer).',
    },
    {
      id: 'az4-package-management-p5',
      level: 'advanced',
      prompt:
        'Explain how a single feed with upstream sources helps defend against a dependency confusion attack.',
      answer:
        'Clients only talk to one feed, and when a package name already exists in the feed from an internal publish, Azure Artifacts by default blocks versions of that name from public upstreams. An attacker who publishes a higher version of your internal name publicly is therefore not pulled in unless someone explicitly allows external versions for that package.',
    },
  ],
  lab: {
    title: 'Publish, consume and promote a package in Azure Artifacts',
    scenario:
      'Create a feed with a public upstream, publish a Universal Package from the CLI and a NuGet package from a pipeline, then promote a version to @Release.',
    prerequisites: [
      'A free Azure DevOps organization and a project',
      'Azure CLI with the azure-devops extension (az extension add --name azure-devops)',
      'The .NET 8 SDK if you want to do the NuGet part locally',
    ],
    tasks: [
      {
        instruction:
          'In Artifacts, create a project-scoped feed named `shared` and tick "Include packages from common public sources".',
        hint: 'That option adds nuget.org, npmjs, PyPI and others as upstream sources.',
      },
      {
        instruction:
          'Sign in with `az login` and publish a folder containing a text file as Universal Package `lab-tool` version 1.0.0.',
      },
      {
        instruction:
          'Download `lab-tool` version `1.*` into a new folder and confirm the file is there.',
      },
      {
        instruction:
          'In Feed settings > Permissions, add `<Project> Build Service (<org>)` as Feed Publisher (Contributor).',
      },
      {
        instruction:
          'Create a pipeline that packs a class library with version `1.0.$(Build.BuildId)` and pushes it to `shared` using `NuGetAuthenticate@1` and `DotNetCoreCLI@2`.',
      },
      {
        instruction:
          'Restore a public package (for example `Newtonsoft.Json`) through the feed, then find it in the feed with the source shown as nuget.org.',
      },
      {
        instruction:
          'Promote your pipeline-built package to the @Release view from the package page.',
      },
    ],
    solution: [
      {
        title: 'CLI part',
        language: 'bash',
        code: `az extension add --name azure-devops
az login
az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>

mkdir -p lab-tool && echo "hello from lab-tool" > lab-tool/readme.txt

az artifacts universal publish \\
  --scope project --feed shared \\
  --name lab-tool --version 1.0.0 \\
  --path ./lab-tool --description "Lab package"

az artifacts universal download \\
  --scope project --feed shared \\
  --name lab-tool --version "1.*" --path ./lab-tool-out
cat ./lab-tool-out/readme.txt`,
      },
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: UseDotNet@2
    inputs:
      version: 8.x
  - task: NuGetAuthenticate@1
  - script: dotnet pack LabLib/LabLib.csproj -c Release -o $(Build.ArtifactStagingDirectory) /p:PackageVersion=1.0.$(Build.BuildId)
  - task: DotNetCoreCLI@2
    inputs:
      command: push
      packagesToPush: $(Build.ArtifactStagingDirectory)/*.nupkg
      nuGetFeedType: internal
      publishVstsFeed: '<project>/shared'`,
      },
    ],
    verification: [
      {
        command:
          'az artifacts universal download --scope project --feed shared --name lab-tool --version 1.0.0 --path ./verify',
        what: 'Confirms the Universal Package is stored and retrievable.',
        expected: 'readme.txt appears in ./verify.',
      },
      {
        command:
          'dotnet nuget add source https://pkgs.dev.azure.com/<org>/<project>/_packaging/shared@Release/nuget/v3/index.json --name shared-release',
        what: 'Adds the @Release view as a source; your promoted package should be listed and unpromoted versions should not.',
        placeholders: ['<org>', '<project>'],
      },
    ],
    cleanup: [
      {
        command: 'rm -rf lab-tool lab-tool-out verify',
        what: 'Removes local lab folders.',
      },
      {
        command: 'az devops project delete --id <project-id> --yes',
        what: 'Deletes the lab project (and its project-scoped feed) if you created one just for this lab. Otherwise delete the feed from Feed settings.',
        placeholders: ['<project-id>'],
      },
    ],
  },
  relatedTopicIds: [
    'az4-yaml-pipelines',
    'az4-github-actions',
    'az4-pipeline-maintenance',
    'az4-security-scanning',
  ],
  docs: [
    {
      title: 'What is Azure Artifacts?',
      url: 'https://learn.microsoft.com/azure/devops/artifacts/start-using-azure-artifacts',
    },
    {
      title: 'Upstream sources',
      url: 'https://learn.microsoft.com/azure/devops/artifacts/concepts/upstream-sources',
    },
    {
      title: 'Feed views',
      url: 'https://learn.microsoft.com/azure/devops/artifacts/concepts/views',
    },
    {
      title: 'Publish and download Universal Packages',
      url: 'https://learn.microsoft.com/azure/devops/artifacts/quickstarts/universal-packages',
    },
    {
      title: 'Introduction to GitHub Packages',
      url: 'https://docs.github.com/packages/learn-github-packages/introduction-to-github-packages',
    },
  ],
}
