import type { Topic } from '../../../types'

export const securityScanning: Topic = {
  id: 'az4-security-scanning',
  title: 'Code, dependency, secret and container scanning',
  domainId: 'az4-security',
  difficulty: 'advanced',
  estimatedMinutes: 40,
  order: 2,
  tags: [
    'ghas',
    'codeql',
    'code-scanning',
    'secret-scanning',
    'push-protection',
    'dependabot',
    'ghazdo',
    'container-scanning',
    'license-compliance',
    'defender-for-cloud',
  ],
  oneLiner:
    'Shift security left with GitHub Advanced Security (CodeQL, secret scanning with push protection, Dependabot), its Azure DevOps edition, container and license scanning, and Defender for Cloud DevOps security for a single view.',
  explanation: [
    'Security scanning in a DevOps pipeline answers four questions automatically on every change. Is our own code vulnerable (**code scanning**, a form of SAST)? Are our dependencies vulnerable or badly licensed (**dependency scanning** and **software composition analysis**)? Did anyone commit a credential (**secret scanning**)? Is the container image we ship built on vulnerable packages (**container scanning**)?',
    'On GitHub, these capabilities come as **GitHub Advanced Security (GHAS)**, now sold as **GitHub Secret Protection** and **GitHub Code Security**. **Code scanning** runs **CodeQL** (GitHub semantic analysis engine that treats code as a database and runs queries) or any third-party tool that uploads **SARIF** results; alerts appear on PRs and in the Security tab. **Secret scanning** detects known token patterns across history, and **push protection** blocks a push that contains one. **Dependabot** provides the **dependency graph**, **Dependabot alerts** (vulnerable dependencies from the GitHub Advisory Database), **security updates** (automatic PRs that bump a vulnerable dependency) and **version updates** (scheduled PRs configured in `dependabot.yml`). The **dependency review** action blocks PRs that introduce vulnerable or disallowed-license dependencies.',
    'For Azure Repos, **GitHub Advanced Security for Azure DevOps** brings the same engines: secret scanning with push protection, dependency scanning (the AdvancedSecurity-Dependency-Scanning task), and CodeQL code scanning (AdvancedSecurity-Codeql-Init, Autobuild and Analyze tasks). It is enabled per repository, project or organization and billed per active committer; newer plans split it into Secret Protection and Code Security.',
    'Around that, you add **container scanning** (Microsoft Defender for Containers scans images in Azure Container Registry and running in AKS; tools such as Trivy scan images in the pipeline), **license compliance** (dependency review license rules, or SCA tools that fail on disallowed licenses), and **Microsoft Defender for Cloud DevOps security**, which connects GitHub, Azure DevOps and GitLab organizations to Defender for Cloud, aggregates findings from GHAS and Microsoft Security DevOps, shows posture recommendations (for example, branch protection disabled or secret scanning off), and can annotate PRs with IaC misconfigurations.',
  ],
  whyItMatters: [
    'This objective is explicit: "automate container scanning, dependency scanning, code scanning and secret scanning" and "configure GitHub Advanced Security for GitHub and Azure DevOps, and integrate Defender for Cloud DevOps security". Questions ask which feature satisfies a requirement, which task to add to a YAML pipeline, or how to block a push.',
    'Finding problems before merge is dramatically cheaper than finding them in production. Push protection stops a leak before it is ever in history, which is far easier than the purge-and-rotate process after the fact.',
    'Vulnerable dependencies are the most common real-world entry point. Automated alerts plus automatic update PRs turn an ever-growing backlog into routine small merges.',
  ],
  howItWorks: [
    '**CodeQL on GitHub**: default setup (one click in Settings, Code security) picks languages and a schedule automatically; advanced setup commits a `codeql.yml` workflow using `github/codeql-action/init`, optional build, and `analyze`. Compiled languages need a build (autobuild or your own steps); interpreted languages do not. Results upload as SARIF, and a rule in branch protection or a ruleset can require code scanning results to have no alerts above a severity.',
    '**Secret scanning** runs on all public repositories for partner patterns and, with Secret Protection enabled, on private ones too, across all history, issues and PR text. **Push protection** rejects pushes containing supported secrets; a developer can bypass with a reason (false positive, used in tests, will fix later), and those bypasses are audited and can be restricted to reviewers with delegated bypass. Custom patterns (regular expressions) can be added at repository, organization or enterprise level.',
    '**Dependabot**: the dependency graph is built from manifests and lock files (or submitted by a build action). Alerts fire when a dependency matches an advisory. Security updates open PRs to the minimum fixed version. Version updates are configured in `.github/dependabot.yml` per ecosystem (npm, nuget, pip, maven, docker, github-actions, terraform and more) with schedule, groups and ignore rules. **Dependabot auto-triage rules** can dismiss low-risk alerts automatically.',
    '**GHAS for Azure DevOps**: enable Advanced Security on the repository (Project settings, Repositories, Security). Secret scanning push protection and history scanning start immediately. Dependency and code scanning run as pipeline tasks you add; results show in the repository Advanced Security tab and can annotate PRs. The build identity needs the Advanced Security permissions to publish results.',
    '**Microsoft Security DevOps** (the MicrosoftSecurityDevOps@1 task or microsoft/security-devops-action) runs a bundle of open-source analyzers, for example Checkov, Terrascan and Template Analyzer for IaC and Trivy for containers, and publishes SARIF to Defender for Cloud. Container images pushed to ACR are also scanned by Defender for Containers vulnerability assessment powered by Microsoft Defender Vulnerability Management.',
    '**Defender for Cloud DevOps security**: add a GitHub or Azure DevOps connector in Environment settings. Defender discovers repositories, shows DevOps security posture and findings across GHAS and other tools, and with Defender CSPM adds code-to-cloud mapping, so a vulnerable container in production can be traced back to the repository and PR that built it.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'Where each scan runs in the lifecycle',
      caption:
        'Earlier is cheaper. Push protection acts before history exists, code and dependency scans before merge, container scans before and after deploy.',
      nodes: [
        {
          label: 'git push',
          detail: 'Secret scanning push protection',
          tone: 'accent',
          branch: { label: 'Secret found', detail: 'Push rejected', tone: 'danger' },
        },
        { label: 'Pull request', detail: 'CodeQL and dependency review' },
        { label: 'Build pipeline', detail: 'Image scan with Trivy or MSDO' },
        { label: 'Registry', detail: 'Defender for Containers scans ACR' },
        { label: 'Runtime and posture', detail: 'Defender for Cloud DevOps view', tone: 'success' },
      ],
    },
    {
      kind: 'decision',
      title: 'Which scanning capability fits the requirement',
      caption: 'Map the requirement wording to the feature; the exam rewards exact matches.',
      question: 'What must the control detect or prevent?',
      branches: [
        {
          condition: 'Credentials reaching the repository',
          result: 'Secret scanning with push protection',
          tone: 'danger',
        },
        {
          condition: 'Vulnerabilities in our own source',
          result: 'Code scanning with CodeQL',
          tone: 'accent',
        },
        { condition: 'Vulnerable or outdated packages', result: 'Dependabot alerts and updates' },
        { condition: 'New risky dependency in a PR', result: 'Dependency review action' },
        { condition: 'CVEs in container images', result: 'Defender for Containers or Trivy' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'dependabot.yml (GitHub)',
      purpose: 'Configures Dependabot version updates per package ecosystem and directory.',
      fields: [
        { path: 'version', meaning: 'Always 2.', required: true },
        {
          path: 'updates[].package-ecosystem',
          meaning: 'npm, nuget, pip, docker, github-actions, terraform and others.',
          required: true,
        },
        { path: 'updates[].directory', meaning: 'Where the manifest lives.', required: true },
        {
          path: 'updates[].schedule.interval',
          meaning: 'daily, weekly or monthly.',
          required: true,
        },
        { path: 'updates[].groups', meaning: 'Bundle related updates into one PR.' },
        { path: 'updates[].ignore', meaning: 'Skip dependencies or version ranges.' },
      ],
    },
    {
      kind: 'Code scanning alert (SARIF result)',
      purpose: 'A finding from CodeQL or a third-party tool, shown on PRs and in the Security tab.',
      fields: [
        {
          path: 'rule.id',
          meaning: 'Query or rule that produced the alert, for example js/sql-injection.',
        },
        { path: 'rule.security_severity_level', meaning: 'critical, high, medium or low.' },
        { path: 'most_recent_instance.location', meaning: 'File and line of the finding.' },
        { path: 'state', meaning: 'open, dismissed or fixed.' },
      ],
    },
    {
      kind: 'Defender for Cloud DevOps connector (Microsoft.Security/securityConnectors)',
      apiVersion: '2023-10-01-preview',
      purpose:
        'Connects a GitHub or Azure DevOps organization to Defender for Cloud for DevOps posture and findings.',
      fields: [
        { path: 'properties.environmentName', meaning: 'Github, AzureDevOps or GitLab.' },
        { path: 'properties.offerings', meaning: 'Enabled plans, for example DevOps posture.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'A week of shift-left at a fintech',
    story: [
      'A fintech with 120 repositories across GitHub and Azure Repos had no systematic scanning. A penetration test found an SQL injection in an internal API and two repositories containing live test API keys.',
      'Day one, they enabled secret scanning with push protection organization-wide in GitHub and enabled Advanced Security for their Azure DevOps projects. Within hours push protection blocked three pushes containing tokens. Historic alerts were triaged and every exposed secret rotated.',
      'Day two, they turned on CodeQL default setup for GitHub repositories and added the AdvancedSecurity CodeQL tasks to a shared Azure Pipelines template, then added a ruleset requiring code scanning results with no high or critical alerts on main.',
      'By the end of the week, Dependabot security updates were opening small PRs, the dependency review action blocked a PR adding a package with a copyleft license the legal team disallowed, and the Defender for Cloud DevOps security dashboard gave the CISO one view across both platforms.',
    ],
  },
  yamlExamples: [
    {
      title: 'CodeQL advanced setup and dependency review (GitHub Actions)',
      language: 'yaml',
      explanation:
        'security-events: write is needed to upload results. Dependency review fails the PR on high severity vulnerabilities or disallowed licenses.',
      code: `name: security
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '30 2 * * 1'

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  codeql:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        language: [javascript-typescript, csharp]
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: \${{ matrix.language }}
          queries: security-extended
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3

  dependency-review:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
          deny-licenses: GPL-3.0, AGPL-3.0`,
    },
    {
      title: 'GHAS for Azure DevOps and Microsoft Security DevOps',
      language: 'yaml',
      explanation:
        'Requires Advanced Security enabled on the repository. MSDO publishes SARIF that Defender for Cloud picks up.',
      code: `trigger:
  - main

pool:
  vmImage: ubuntu-latest

steps:
  - task: AdvancedSecurity-Codeql-Init@1
    inputs:
      languages: 'javascript,csharp'
  - task: AdvancedSecurity-Codeql-Autobuild@1
  - task: AdvancedSecurity-Dependency-Scanning@1
  - task: AdvancedSecurity-Codeql-Analyze@1

  - task: MicrosoftSecurityDevOps@1
    inputs:
      categories: 'IaC,containers'`,
    },
    {
      title: 'Container image scan with Trivy before push',
      language: 'yaml',
      explanation: 'Fails the job on critical or high vulnerabilities that have a fix available.',
      code: `steps:
  - script: docker build -t $(acrName).azurecr.io/web:$(Build.BuildId) .
    displayName: Build image
  - script: |
      docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
        aquasec/trivy:latest image --exit-code 1 --ignore-unfixed \\
        --severity CRITICAL,HIGH $(acrName).azurecr.io/web:$(Build.BuildId)
    displayName: Scan image`,
    },
  ],
  imperative: [
    {
      command:
        'gh api repos/<owner>/<repo> --method PATCH -F "security_and_analysis[secret_scanning][status]=enabled" -F "security_and_analysis[secret_scanning_push_protection][status]=enabled"',
      what: 'Enables secret scanning and push protection on a repository.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command:
        'gh api repos/<owner>/<repo>/code-scanning/alerts --jq ".[] | {rule: .rule.id, severity: .rule.security_severity_level, state}"',
      what: 'Lists code scanning alerts with their rule and severity.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command:
        'gh api repos/<owner>/<repo>/dependabot/alerts --jq ".[] | {pkg: .dependency.package.name, sev: .security_advisory.severity}"',
      what: 'Lists open Dependabot alerts.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command: 'gh api repos/<owner>/<repo>/vulnerability-alerts --method PUT',
      what: 'Enables Dependabot alerts for the repository.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command: 'az acr repository show-tags -n <acr-name> --repository web -o table',
      what: 'Lists image tags in ACR, whose vulnerability findings appear in Defender for Cloud recommendations.',
      placeholders: ['<acr-name>'],
    },
    {
      command: 'az security pricing create -n Containers --tier Standard',
      what: 'Enables the Defender for Containers plan on the subscription.',
    },
  ],
  declarative: {
    steps: [
      'Enable secret scanning and push protection at organization level, not repository by repository.',
      'Commit a dependabot.yml per repository covering every ecosystem, including github-actions.',
      'Put CodeQL and dependency scanning in a shared pipeline template or reusable workflow.',
      'Require code scanning results and dependency review in rulesets or branch policies.',
      'Connect GitHub and Azure DevOps to Defender for Cloud for one posture view.',
    ],
    code: [
      {
        title: '.github/dependabot.yml',
        language: 'yaml',
        explanation:
          'Weekly grouped updates for npm, Docker base images and the actions used in workflows.',
        code: `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      dev-dependencies:
        dependency-type: development
    open-pull-requests-limit: 10

  - package-ecosystem: docker
    directory: /
    schedule:
      interval: weekly

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly`,
      },
      {
        title: 'Custom secret scanning pattern (concept)',
        language: 'text',
        explanation:
          'Added in Settings, Code security, Custom patterns. Test it on sample strings before publishing.',
        code: `Name:            Contoso internal API key
Secret format:   ctso_[A-Za-z0-9]{32}
Before secret:   (?:^|[^A-Za-z0-9])
After secret:    (?:$|[^A-Za-z0-9])
Push protection: enabled after dry run`,
      },
    ],
  },
  verification: [
    {
      command: 'gh api repos/<owner>/<repo> --jq ".security_and_analysis"',
      what: 'Shows which security features are enabled.',
      expected: 'secret_scanning and secret_scanning_push_protection status enabled',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command:
        'gh api repos/<owner>/<repo>/code-scanning/analyses --jq ".[0] | {tool: .tool.name, created_at}"',
      what: 'Confirms the latest code scanning analysis ran.',
      expected: 'tool CodeQL with a recent date',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command:
        'az security assessment list --query "[?contains(displayName, \'vulnerab\')].{name:displayName,status:status.code}" -o table',
      what: 'Lists Defender for Cloud assessments related to vulnerabilities, including container image findings.',
    },
  ],
  troubleshooting: [
    {
      command: 'git push',
      what: 'Push rejected with "GH013: Repository rule violations found" and "Push cannot contain secrets": remove the secret from the commit (amend or rebase), rotate it, and push again.',
      expected: 'remote: - Push cannot contain secrets',
    },
    {
      command: 'gh run view <run-id> --log-failed',
      what: 'CodeQL fails on a compiled language: autobuild could not build. Replace autobuild with explicit build steps.',
      placeholders: ['<run-id>'],
    },
    {
      command: 'gh api repos/<owner>/<repo>/dependency-graph/sbom --jq ".sbom.packages | length"',
      what: 'If Dependabot shows no alerts, check whether the dependency graph found any packages at all (lock file missing).',
      placeholders: ['<owner>', '<repo>'],
    },
  ],
  commonMistakes: [
    'Relying on secret scanning alerts alone. Alerts fire after the secret is in history; push protection prevents it.',
    'Dismissing a secret alert as fixed after deleting the file, without rotating the credential.',
    'Running CodeQL for a compiled language without a working build, which produces an empty or failed analysis.',
    'Forgetting `security-events: write`, so SARIF upload fails.',
    'Enabling Dependabot alerts but not security updates or dependabot.yml, so alerts pile up with no fix PRs.',
    'Expecting GHAS for Azure DevOps to scan code without adding the pipeline tasks. Only secret scanning is automatic.',
  ],
  examTips: [
    'Prevent committing secrets: push protection. Detect already-committed secrets: secret scanning alerts.',
    'SAST equals code scanning with CodeQL; SCA equals Dependabot and dependency scanning.',
    'GHAS for Azure DevOps tasks: AdvancedSecurity-Codeql-Init, -Autobuild, -Analyze and AdvancedSecurity-Dependency-Scanning.',
    'Defender for Cloud DevOps security is about a single posture view across GitHub, Azure DevOps and GitLab, and code-to-cloud mapping.',
    'Block PRs that add vulnerable or badly licensed dependencies: dependency review action.',
  ],
  summary: [
    'Code scanning (CodeQL), dependency scanning (Dependabot), secret scanning and container scanning cover the four main risk areas.',
    'Push protection stops secrets before they enter history.',
    'GHAS exists for both GitHub and Azure DevOps; in Azure DevOps code and dependency scans are pipeline tasks.',
    'Container scanning happens in the pipeline and continuously in ACR and AKS via Defender for Containers.',
    'Defender for Cloud aggregates DevOps findings and posture into one place.',
  ],
  practice: [
    {
      id: 'az4-security-scanning-p1',
      level: 'beginner',
      prompt:
        'Which GitHub feature stops a developer from pushing a commit that contains an Azure storage key?',
      answer: 'Secret scanning push protection.',
      explanation:
        'Plain secret scanning only raises an alert after the push; push protection rejects the push itself.',
    },
    {
      id: 'az4-security-scanning-p2',
      level: 'intermediate',
      prompt:
        'Your Azure Repos repository has Advanced Security enabled but shows no code scanning alerts. Why?',
      answer:
        'Code scanning is not automatic in GHAS for Azure DevOps; you must add the AdvancedSecurity-Codeql Init, Autobuild and Analyze tasks to a pipeline.',
      explanation:
        'Only secret scanning starts on enablement; dependency and code scanning run as pipeline tasks.',
    },
    {
      id: 'az4-security-scanning-p3',
      level: 'intermediate',
      prompt: 'What is the difference between Dependabot security updates and version updates?',
      answer:
        'Security updates open PRs only for dependencies with a known vulnerability, bumping to the minimum fixed version. Version updates open scheduled PRs to keep dependencies current, configured in dependabot.yml.',
      explanation: 'Both create PRs, but only version updates need dependabot.yml.',
    },
    {
      id: 'az4-security-scanning-p4',
      level: 'advanced',
      prompt:
        'Leadership wants one view of security findings across GitHub, Azure DevOps and Azure workloads. What do you configure?',
      answer:
        'Connect the GitHub and Azure DevOps organizations to Microsoft Defender for Cloud with DevOps connectors, and run GHAS and Microsoft Security DevOps so findings flow in; Defender CSPM adds code-to-cloud mapping.',
      explanation: 'Defender for Cloud DevOps security is the aggregation layer across platforms.',
    },
  ],
  lab: {
    title: 'Turn on GitHub security features and watch them work',
    scenario:
      'In a personal public GitHub repository (GHAS features are free for public repos), enable push protection, CodeQL, Dependabot and dependency review, and trigger each one.',
    prerequisites: [
      'A GitHub account',
      'A new public repository with a small Node.js project',
      'gh CLI and git',
    ],
    tasks: [
      { instruction: 'Enable secret scanning and push protection on the repository.' },
      {
        instruction:
          'Try to push a file containing a sample token format from the GitHub documentation test patterns and confirm the push is blocked.',
        hint: 'Never use a real credential; use the documented test pattern for push protection.',
      },
      { instruction: 'Enable CodeQL default setup in Settings, Code security.' },
      {
        instruction:
          'Add `.github/dependabot.yml` for npm and github-actions, and enable Dependabot alerts and security updates.',
      },
      {
        instruction:
          'Add a dependency-review workflow and open a PR that adds an old package version with a known advisory.',
      },
      {
        instruction:
          'Confirm the dependency review job fails and a Dependabot alert or PR appears.',
      },
    ],
    solution: [
      {
        title: 'Enable features',
        language: 'bash',
        code: `gh api repos/<owner>/<repo> --method PATCH \\
  -F "security_and_analysis[secret_scanning][status]=enabled" \\
  -F "security_and_analysis[secret_scanning_push_protection][status]=enabled"
gh api repos/<owner>/<repo>/vulnerability-alerts --method PUT
gh api repos/<owner>/<repo>/automated-security-fixes --method PUT`,
      },
      {
        title: 'Trigger dependency review',
        language: 'bash',
        code: `git switch -c add-old-lib
npm install lodash@4.17.15 --save   # an old version with published advisories
git commit -am "Add lodash" && git push -u origin add-old-lib
gh pr create --fill
gh pr checks --watch`,
      },
    ],
    verification: [
      {
        command:
          'gh api repos/<owner>/<repo> --jq ".security_and_analysis.secret_scanning_push_protection.status"',
        what: 'Push protection is on.',
        expected: '"enabled"',
      },
      {
        command: 'gh api repos/<owner>/<repo>/dependabot/alerts --jq "length"',
        what: 'At least one Dependabot alert exists after the vulnerable dependency merges to main (or is reported by review on the PR).',
        expected: 'A number greater than 0',
      },
    ],
    cleanup: [
      {
        command: 'gh pr close add-old-lib --delete-branch',
        what: 'Closes the test PR without merging.',
      },
      {
        command: 'gh repo delete <owner>/<repo> --yes',
        what: 'Deletes the lab repository.',
      },
    ],
  },
  relatedTopicIds: [
    'az4-pipeline-security',
    'az4-repo-management',
    'az4-testing-strategy',
    'az4-package-management',
  ],
  docs: [
    {
      title: 'About GitHub Advanced Security',
      url: 'https://docs.github.com/get-started/learning-about-github/about-github-advanced-security',
    },
    {
      title: 'Configure GitHub Advanced Security for Azure DevOps',
      url: 'https://learn.microsoft.com/azure/devops/repos/security/configure-github-advanced-security-features',
    },
    {
      title: 'About push protection',
      url: 'https://docs.github.com/code-security/secret-scanning/introduction/about-push-protection',
    },
    {
      title: 'Overview of Microsoft Defender for Cloud DevOps security',
      url: 'https://learn.microsoft.com/azure/defender-for-cloud/defender-for-devops-introduction',
    },
    {
      title: 'Dependabot options reference',
      url: 'https://docs.github.com/code-security/dependabot/working-with-dependabot/dependabot-options-reference',
    },
  ],
}
