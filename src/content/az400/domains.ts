import type { Domain } from '../types'

/**
 * The five functional groups of the AZ-400 study guide.
 *
 * Microsoft publishes weights as ranges, so each domain shows its published
 * range as a label and `examWeight` stays null. Build and release pipelines
 * are more than half the exam, and the lesson count reflects that.
 */
export const az400Domains: Domain[] = [
  {
    id: 'az4-processes',
    title: 'Design and implement processes and communications',
    shortTitle: 'Processes',
    examWeight: null,
    weightLabel: '10–15%',
    description:
      'Traceability and flow of work with Azure Boards and GitHub, DevOps metrics, dashboards, wikis, documentation and integrating collaboration tools.',
    officialCompetencies: [
      'Design and implement a structure for the flow of work, including GitHub Flow',
      'Design and implement a strategy for feedback cycles, including notifications and GitHub issues',
      'Design and implement integration for tracking work, including GitHub projects, Azure Boards and repositories',
      'Design and implement source, bug and quality traceability',
      'Design and implement metrics and queries for cycle time, lead time, time to recovery and deployment frequency',
      'Document a project by configuring wikis and process diagrams, including Markdown and Mermaid syntax',
      'Configure release documentation, including release notes and API documentation',
      'Configure integration by using webhooks and between Azure Boards, GitHub repositories and Microsoft Teams',
    ],
    accent: 'blue',
    order: 1,
  },
  {
    id: 'az4-source',
    title: 'Design and implement a source control strategy',
    shortTitle: 'Source control',
    examWeight: null,
    weightLabel: '10–15%',
    description:
      'Branching strategies, pull request workflows, branch policies and protections, large repositories, permissions and recovering or purging data from Git history.',
    officialCompetencies: [
      'Design a branch strategy, including trunk-based, feature branch and release branch',
      'Design and implement a pull request workflow by using branch policies and branch protections',
      'Implement branch merging restrictions by using branch policies and branch protections',
      'Design and implement a strategy for managing large files, including Git LFS and git-fat',
      'Design a strategy for scaling and optimizing a Git repository, including Scalar and cross-repository sharing',
      'Configure permissions and tags in the source control repository',
      'Recover specific data by using Git commands and remove specific data from source control',
    ],
    accent: 'violet',
    order: 2,
  },
  {
    id: 'az4-pipelines',
    title: 'Design and implement build and release pipelines',
    shortTitle: 'Build & release',
    examWeight: null,
    weightLabel: '50–55%',
    description:
      'Package management, testing strategy, Azure Pipelines and GitHub Actions, agents and runners, templates, deployment strategies, infrastructure as code and pipeline maintenance.',
    officialCompetencies: [
      'Design a package management strategy, including Azure Artifacts, GitHub Packages, NuGet and npm, and a versioning strategy',
      'Design a testing strategy, including quality and release gates, and implement tests in a pipeline',
      'Select a deployment automation solution, including GitHub Actions and Azure Pipelines',
      'Design and implement a GitHub runner or Azure DevOps agent infrastructure, including cost, tool selection, licenses, connectivity and maintainability',
      'Develop and implement pipeline trigger rules, and develop pipelines by using YAML',
      'Design and implement a strategy for job execution order, including parallelism and multi-stage pipelines',
      'Develop and implement complex pipeline scenarios, such as hybrid pipelines, VM templates and self-hosted runners or agents',
      'Create reusable pipeline elements, including YAML templates, task groups, variables and variable groups',
      'Design a deployment strategy, including blue-green, canary, ring, progressive exposure, feature flags and A/B testing',
      'Design a strategy to ensure reliability and to minimize downtime, including VIP swap, load balancing, rolling deployments and deployment slots',
      'Design and implement an infrastructure as code strategy, including Bicep, ARM templates, Terraform and Azure Deployment Environments',
      'Monitor pipeline health, including failure rate, duration and flaky tests, and optimize pipelines for cost, time, performance and reliability',
      'Design and implement a retention strategy for pipeline artifacts and dependencies, and migrate a pipeline from classic to YAML',
    ],
    accent: 'emerald',
    order: 3,
  },
  {
    id: 'az4-security',
    title: 'Develop a security and compliance plan',
    shortTitle: 'Security & compliance',
    examWeight: null,
    weightLabel: '10–15%',
    description:
      'Authentication and authorization for pipelines, service connections and workload identity federation, secrets with Azure Key Vault, and security and compliance scanning.',
    officialCompetencies: [
      'Choose between service principals and managed identity, including workload identity federation',
      'Implement and manage GitHub authentication, including GitHub Apps, GITHUB_TOKEN and personal access tokens',
      'Implement and manage Azure DevOps service connections, personal access tokens, permissions and security groups',
      'Implement and manage secrets, keys and certificates by using Azure Key Vault and GitHub secrets',
      'Design and implement a strategy for managing sensitive files during deployment',
      'Automate container scanning, dependency scanning, code scanning and secret scanning',
      'Configure GitHub Advanced Security for GitHub and Azure DevOps, and integrate Microsoft Defender for Cloud DevOps Security',
    ],
    accent: 'rose',
    order: 4,
  },
  {
    id: 'az4-instrumentation',
    title: 'Implement an instrumentation strategy',
    shortTitle: 'Instrumentation',
    examWeight: null,
    weightLabel: '5–10%',
    description:
      'Monitoring for DevOps environments with Azure Monitor, Application Insights and Log Analytics, and analysing telemetry with KQL.',
    officialCompetencies: [
      'Configure and integrate monitoring by using Azure Monitor, including VM insights, Container insights, Storage insights and Network insights',
      'Configure collection of telemetry by using Application Insights',
      'Configure monitoring in GitHub, including enabling insights and creating charts',
      'Inspect distributed tracing by using Application Insights',
      'Interrogate logs by using basic Kusto Query Language (KQL) queries',
      'Inspect infrastructure performance indicators, including CPU, memory, disk and network',
      'Configure alerts for events in GitHub Actions and Azure Pipelines',
    ],
    accent: 'amber',
    order: 5,
  },
]
