import type { Topic } from '../../../types'

export const docsIntegration: Topic = {
  id: 'az4-docs-integration',
  title: 'Wikis, release documentation and tool integration',
  domainId: 'az4-processes',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  order: 2,
  tags: [
    'wiki',
    'markdown',
    'mermaid',
    'release-notes',
    'api-docs',
    'webhooks',
    'service-hooks',
    'teams',
    'slack',
  ],
  oneLiner:
    'Document projects with Markdown and Mermaid in Azure DevOps and GitHub wikis, generate release notes and API docs, and wire events into Teams, Slack and other systems with service hooks and webhooks.',
  explanation: [
    'DevOps is as much about communication as automation. Two things carry that communication: **documentation** that lives next to the code and changes with it, and **integrations** that push events (a failed build, a new PR, a completed deployment) to where people already are, such as Microsoft Teams or Slack.',
    'Azure DevOps has two wiki flavours. A **project wiki** is provisioned once per project and stored in a hidden Git repository that you edit through the web UI. A **published code wiki** (also called wiki as code) publishes a folder from an existing Git repository branch as a wiki, so pages are reviewed in pull requests and versioned with the code. GitHub repositories have a separate **GitHub Wiki** (its own `.wiki.git` repository), but many teams simply keep Markdown in a `docs/` folder or publish it with GitHub Pages.',
    'Both platforms render **Markdown**, and both render **Mermaid** diagrams. In Azure DevOps wikis you write a block starting with `::: mermaid` and ending with `:::`; in GitHub Markdown you use a fenced block labelled `mermaid`. Mermaid supports flowcharts, sequence diagrams, Gantt charts, state diagrams, class diagrams and git graphs, which makes process diagrams diff-able text rather than binary images.',
    'For integration, Azure DevOps uses **service hooks**: a subscription that fires on an event (build completed, work item updated, PR created, release deployment completed) and sends it to a consumer such as Slack, Azure Service Bus, Azure Storage queue, Jenkins or a generic **Web Hooks** endpoint (which can target a Teams workflow webhook, Azure Functions or Logic Apps). GitHub uses **webhooks** configured on a repository, organization or GitHub App, delivering signed JSON payloads to an HTTPS URL. The **Microsoft Teams** apps for Azure Boards, Azure Pipelines and GitHub let you subscribe a channel to events and act on them from Teams.',
  ],
  whyItMatters: [
    'The exam objectives explicitly name wikis, Markdown, Mermaid, release notes, API documentation, webhooks and Teams integration. Expect questions like "which wiki type lets documentation be reviewed in pull requests?" or "how do you notify a Teams channel when a release fails?".',
    'Documentation that is not versioned with the code drifts within weeks. Wiki as code and generated API docs keep the source of truth close to the change, so a PR that changes behaviour also changes the docs, and reviewers see both.',
    'Integrations shorten feedback loops. A failed deployment that posts to the on-call channel with a link to the run gets fixed faster than one that waits for someone to open the portal.',
  ],
  howItWorks: [
    'A **project wiki** is created from Overview, Wiki, Create project wiki. Pages are Markdown files in a Git repo named `<project>.wiki`; page order lives in `.order` files. You cannot create branches for it in the UI, so it suits informal team notes.',
    'A **code wiki** is created with Publish code as wiki: pick a repository, a branch and a folder. Each Markdown file becomes a page. You can publish additional versions from release branches, so readers can switch between docs for v1 and v2.',
    'Wiki Markdown supports tables, task lists, `[[_TOC_]]` for a table of contents, `[[_TOSP_]]` for a subpage list, `@mentions`, work item links with `#123`, and embedded Mermaid with the `::: mermaid` syntax.',
    '**Release notes** can be generated from the pipeline: a task or script queries the work items and commits associated with the run (via REST API or the Generate Release Notes extension) and writes Markdown that is published to the wiki or attached to a GitHub Release. On GitHub, `gh release create --generate-notes` builds notes from merged PRs, and `.github/release.yml` groups them by label.',
    '**API documentation** is best generated from code: OpenAPI (Swagger) specs produced by the build for REST APIs, or tools such as DocFX for .NET and TypeDoc for TypeScript. Publish the output as a pipeline artifact, to a static site (Azure Static Web Apps, GitHub Pages) or to Azure API Management developer portal.',
    'A **service hook subscription** has three parts: the publisher and event (for example Build completed with filter status Failed), the consumer (Slack, Service Bus, Web Hooks) and the action (post a message, send an HTTP POST). A **GitHub webhook** has a payload URL, a content type, a **secret** used to sign each payload with an HMAC SHA-256 header (`X-Hub-Signature-256`), and the list of events. Receivers must validate that signature.',
  ],
  diagrams: [
    {
      kind: 'sequence',
      title: 'A failed build reaches the Teams channel',
      caption:
        'The service hook subscription filters the event, so only failures on main reach the channel.',
      participants: [
        { id: 'pipe', label: 'Azure Pipelines' },
        { id: 'hook', label: 'Service hook' },
        { id: 'teams', label: 'Teams channel' },
        { id: 'dev', label: 'On-call engineer' },
      ],
      messages: [
        { from: 'pipe', to: 'hook', label: 'Build completed event' },
        { from: 'hook', to: 'teams', label: 'Matches failed filter: post card' },
        { from: 'teams', to: 'dev', label: 'Notification' },
        { from: 'dev', to: 'pipe', label: 'Open run, rerun failed jobs' },
      ],
    },
    {
      kind: 'decision',
      title: 'Choosing where documentation lives',
      caption:
        'If docs must be reviewed and versioned with the code, publish them from the repository.',
      question: 'What does this documentation need?',
      branches: [
        {
          condition: 'Quick team notes edited in the browser',
          result: 'Azure DevOps project wiki',
          detail: 'One per project, hidden wiki repo',
        },
        {
          condition: 'Reviewed in PRs and versioned per release',
          result: 'Code wiki from a repo folder',
          detail: 'Publish code as wiki',
          tone: 'accent',
        },
        {
          condition: 'Public docs site for a GitHub project',
          result: 'docs folder plus GitHub Pages',
          detail: 'Or the repository GitHub Wiki',
        },
        {
          condition: 'Reference for a REST API',
          result: 'Generated OpenAPI docs',
          detail: 'Built and published by the pipeline',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Service hook subscription (Azure DevOps)',
      purpose: 'Sends selected Azure DevOps events to an external consumer.',
      fields: [
        {
          path: 'publisherId',
          meaning: 'Event source, for example tfs (Boards, Repos) or pipelines.',
          required: true,
        },
        {
          path: 'eventType',
          meaning: 'Event such as build.complete, git.pullrequest.created, workitem.updated.',
          required: true,
        },
        {
          path: 'publisherInputs',
          meaning: 'Filters, for example a pipeline definition, branch or build status.',
        },
        {
          path: 'consumerId',
          meaning: 'Consumer such as webHooks, slack, azureServiceBus, azureStorageQueue.',
          required: true,
        },
        { path: 'consumerInputs.url', meaning: 'Target URL for Web Hooks and Slack consumers.' },
      ],
    },
    {
      kind: 'GitHub webhook',
      purpose: 'Delivers repository or organization events as signed HTTP POST requests.',
      fields: [
        { path: 'config.url', meaning: 'The HTTPS payload URL.', required: true },
        { path: 'config.content_type', meaning: 'json or form.' },
        {
          path: 'config.secret',
          meaning: 'Shared secret used to sign each delivery (X-Hub-Signature-256).',
        },
        { path: 'events', meaning: 'Events such as push, pull_request, workflow_run, release.' },
        { path: 'active', meaning: 'Whether deliveries are sent.' },
      ],
    },
    {
      kind: 'Wiki (Azure DevOps)',
      purpose: 'Markdown documentation, either the project wiki or published code wikis.',
      fields: [
        { path: 'type', meaning: 'projectWiki or codeWiki.' },
        {
          path: 'mappedPath',
          meaning: 'For a code wiki, the repository folder that is published.',
        },
        { path: 'versions', meaning: 'Branches published as selectable wiki versions.' },
        { path: '.order', meaning: 'File that controls page order in a folder.' },
      ],
    },
  ],
  realWorldExample: {
    title: 'Docs that finally stayed current',
    story: [
      'A platform team kept runbooks in a project wiki. Every incident review found the same problem: the runbook described a deployment process that had changed months before, because nobody remembered to edit the wiki after changing the pipeline.',
      'They moved runbooks into a `docs/` folder in the pipeline repository and published it with Publish code as wiki. The branch policy now requires a reviewer from the SRE group for changes under `docs/runbooks`, and PRs that change pipeline YAML without touching docs get a reminder comment from a small check.',
      'Architecture diagrams moved from images to Mermaid blocks, so a change to a flow shows up as a readable diff. Release notes are generated in the release stage from linked work items and attached to the GitHub Release and the wiki.',
      'A service hook posts failed production deployments to the incident Teams channel, with the run link and the triggering commit. The mean time to acknowledge dropped from about half an hour to a few minutes because nobody had to notice a red dashboard first.',
    ],
  },
  yamlExamples: [
    {
      title: 'Mermaid in an Azure DevOps wiki page',
      language: 'text',
      explanation:
        'Azure DevOps wikis use the triple-colon container syntax. GitHub uses a fenced code block labelled mermaid instead.',
      code: `# Release process

[[_TOC_]]

::: mermaid
flowchart LR
  PR[Pull request] --> CI[CI build and tests]
  CI --> DEV[Deploy dev]
  DEV --> APPROVE{Approval}
  APPROVE -->|approved| PROD[Deploy prod]
  APPROVE -->|rejected| FIX[Fix and new PR]
:::`,
    },
    {
      title: 'Release notes grouped by label on GitHub',
      language: 'yaml',
      explanation:
        'Saved as .github/release.yml. Used by the generate release notes feature in the UI, the API and gh release create --generate-notes.',
      code: `changelog:
  exclude:
    labels:
      - skip-changelog
  categories:
    - title: Breaking changes
      labels:
        - breaking
    - title: Features
      labels:
        - enhancement
    - title: Bug fixes
      labels:
        - bug
    - title: Other changes
      labels:
        - "*"`,
    },
    {
      title: 'Publish generated API docs from a pipeline',
      language: 'yaml',
      explanation:
        'Generates an OpenAPI document during the build and publishes it as an artifact that a later stage can deploy to a docs site.',
      code: `steps:
  - script: |
      dotnet build src/Api/Api.csproj -c Release
      dotnet tool restore
      dotnet swagger tofile --output $(Build.ArtifactStagingDirectory)/openapi.json \\
        src/Api/bin/Release/net8.0/Api.dll v1
    displayName: Generate OpenAPI document

  - task: PublishPipelineArtifact@1
    inputs:
      targetPath: $(Build.ArtifactStagingDirectory)
      artifact: api-docs`,
    },
  ],
  imperative: [
    {
      command:
        'az devops wiki create --name "Web docs" --type codewiki --repository web-shop --mapped-path /docs --version main',
      what: 'Publishes the docs folder of the main branch as a code wiki.',
      expected: 'JSON describing the wiki with type codeWiki.',
    },
    {
      command:
        'az devops wiki page create --wiki "Web docs" --path "/Runbooks/Deploy" --file-path deploy.md',
      what: 'Creates a page in a wiki from a local Markdown file.',
    },
    {
      command: 'az devops service-endpoint list -o table',
      what: 'Lists service connections, a common prerequisite check before wiring a Service Bus or Jenkins consumer.',
    },
    {
      command: 'gh release create v1.4.0 --generate-notes',
      what: 'Creates a GitHub Release with notes generated from merged pull requests since the previous release.',
      expected: 'The release URL.',
    },
    {
      command:
        'gh api repos/<owner>/<repo>/hooks -f name=web -f "config[url]=https://hooks.contoso.com/gh" -f "config[content_type]=json" -f "config[secret]=<webhook-secret>" -f "events[]=workflow_run"',
      what: 'Creates a repository webhook that fires when a workflow run is requested or completed.',
      placeholders: ['<owner>', '<repo>', '<webhook-secret>'],
    },
  ],
  declarative: {
    steps: [
      'Keep documentation Markdown and Mermaid files under docs/ in the repository.',
      'Publish the folder as a code wiki, or build it to a static site in the pipeline.',
      'Generate release notes and API docs as pipeline steps, not by hand.',
      'Store service hook and webhook setup as scripts so they can be recreated.',
    ],
    code: [
      {
        title: 'Service hook to a generic web hook, via the REST API',
        language: 'json',
        explanation:
          'Body for POST https://dev.azure.com/<org>/_apis/hooks/subscriptions?api-version=7.1. Fires when a build of a given pipeline fails.',
        code: `{
  "publisherId": "tfs",
  "eventType": "build.complete",
  "resourceVersion": "1.0",
  "consumerId": "webHooks",
  "consumerActionId": "httpRequest",
  "publisherInputs": {
    "projectId": "<project-guid>",
    "definitionName": "web-shop-ci",
    "buildStatus": "Failed"
  },
  "consumerInputs": {
    "url": "https://hooks.contoso.com/azdo/build-failed"
  }
}`,
      },
      {
        title: 'GitHub Actions job that posts a failure to Teams',
        language: 'yaml',
        explanation:
          'Runs only when an earlier job failed. The incoming webhook URL (a Teams workflow webhook) is stored as a secret.',
        code: `jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  notify:
    needs: build
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Post to Teams
        run: |
          curl -sS -H "Content-Type: application/json" \\
            -d '{"text":"Build failed: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}"}' \\
            "\${{ secrets.TEAMS_WEBHOOK_URL }}"`,
      },
    ],
  },
  verification: [
    {
      command: 'az devops wiki list -o table',
      what: 'Lists wikis in the project and their type.',
      expected: 'The project wiki and any code wikis.',
    },
    {
      command: 'az devops invoke --area hooks --resource subscriptions --http-method GET',
      what: 'Lists service hook subscriptions in the organization.',
    },
    {
      command: 'gh api repos/<owner>/<repo>/hooks/<hook-id>/deliveries',
      what: 'Shows recent webhook deliveries and their response status codes.',
      placeholders: ['<owner>', '<repo>', '<hook-id>'],
    },
  ],
  troubleshooting: [
    {
      command:
        'gh api repos/<owner>/<repo>/hooks/<hook-id>/deliveries/<delivery-id>/attempts -X POST',
      what: 'Redelivers a failed webhook delivery after you fix the receiver.',
      placeholders: ['<owner>', '<repo>', '<hook-id>', '<delivery-id>'],
    },
    {
      command:
        'az devops invoke --area hooks --resource notifications --route-parameters subscriptionId=<id>',
      what: 'Shows notification history for a service hook subscription, including HTTP errors from the consumer.',
      placeholders: ['<id>'],
    },
    {
      command: 'git log --oneline -- docs/',
      what: 'When a code wiki shows stale content, confirm the change was actually merged into the published branch.',
    },
  ],
  commonMistakes: [
    'Using the GitHub fenced mermaid syntax in an Azure DevOps wiki. Azure DevOps expects `::: mermaid` blocks.',
    'Assuming a project wiki can be reviewed through pull requests. For PR review, publish a code wiki from a repository.',
    'Receiving GitHub webhooks without validating the `X-Hub-Signature-256` HMAC, which lets anyone forge events.',
    'Writing release notes by hand at release time instead of generating them from linked work items and merged PRs.',
    'Subscribing a Teams channel to every event, which trains people to ignore it. Filter by pipeline, branch and status.',
  ],
  examTips: [
    'Project wiki equals one per project, edited in the browser. Code wiki equals published from a repo folder and branch, versionable, PR-reviewed.',
    'Service hooks are the Azure DevOps answer for pushing events to Teams, Slack, Service Bus, Storage queues or any HTTP endpoint.',
    'GitHub webhooks are secured with a shared secret and an HMAC signature header; the receiver verifies it.',
    'For "generate release notes automatically", look for pipeline-generated notes from work items or `gh release create --generate-notes`.',
    'Mermaid is text, so diagrams are diffable and reviewable. That is the reason the exam likes it.',
  ],
  summary: [
    'Wikis: project wiki for quick notes, code wiki for reviewed, versioned documentation.',
    'Markdown and Mermaid render in both Azure DevOps and GitHub, with different Mermaid block syntax.',
    'Release notes and API docs should be generated by the pipeline.',
    'Service hooks (Azure DevOps) and webhooks (GitHub) push events to Teams, Slack and custom systems.',
    'Filter and secure integrations so they stay useful and trustworthy.',
  ],
  practice: [
    {
      id: 'az4-docs-integration-p1',
      level: 'beginner',
      prompt:
        'Your team wants wiki pages to be reviewed in pull requests and versioned per release. Which Azure DevOps wiki type fits?',
      answer:
        'A published code wiki, created with Publish code as wiki from a repository folder and branch.',
      explanation:
        'The project wiki has no PR workflow in the UI, while a code wiki is just Markdown in a normal repository, so branch policies apply.',
    },
    {
      id: 'az4-docs-integration-p2',
      level: 'intermediate',
      prompt:
        'How should a service that receives GitHub webhooks confirm a request really came from GitHub?',
      answer:
        'Compute an HMAC SHA-256 of the raw body with the shared webhook secret and compare it, in constant time, with the X-Hub-Signature-256 header.',
      explanation:
        'Without the check any caller who knows the URL could post fake push or release events.',
    },
    {
      id: 'az4-docs-integration-p3',
      level: 'intermediate',
      prompt: 'Name three consumers an Azure DevOps service hook can send events to.',
      answer:
        'Any three of Slack, Web Hooks, Azure Service Bus, Azure Storage queue or Jenkins; Teams is reached through its Azure DevOps apps or a Teams workflow webhook.',
      explanation:
        'The Web Hooks consumer is the generic option for any HTTPS endpoint, including Azure Functions or Logic Apps.',
    },
    {
      id: 'az4-docs-integration-p4',
      level: 'advanced',
      prompt: 'Why are generated release notes more trustworthy than handwritten ones?',
      answer:
        'They are built from the work items and pull requests actually included in the build, so they cannot omit or invent changes, and they are produced every time.',
      explanation:
        'Handwritten notes depend on memory and are often written after the fact under time pressure.',
    },
  ],
  lab: {
    title: 'Code wiki with Mermaid and a failure notification',
    scenario:
      'Publish documentation from a repository folder as a wiki, include a Mermaid process diagram, and send failed builds to a webhook receiver.',
    prerequisites: [
      'A free Azure DevOps organization and project with a Git repository',
      'Azure CLI with the azure-devops extension',
      'A test webhook endpoint (for example a request bin you control)',
    ],
    tasks: [
      {
        instruction:
          'In the repository, create `docs/index.md` with a heading and a `::: mermaid` flowchart of your release process.',
      },
      { instruction: 'Commit and push the docs folder to main.' },
      {
        instruction: 'Publish the docs folder as a code wiki for the main branch.',
        hint: 'az devops wiki create --type codewiki',
      },
      { instruction: 'Open the wiki and confirm the Mermaid diagram renders.' },
      {
        instruction:
          'Create a service hook subscription (Project settings, Service hooks) for Build completed with status Failed, consumer Web Hooks, pointing at your test endpoint.',
      },
      {
        instruction:
          'Run a pipeline that fails on purpose (for example `exit 1`) and confirm the endpoint received a payload.',
      },
    ],
    solution: [
      {
        title: 'Docs and code wiki',
        language: 'bash',
        code: `mkdir -p docs
cat > docs/index.md <<'EOF'
# Release process

::: mermaid
flowchart LR
  A[PR] --> B[CI] --> C[Deploy dev] --> D[Deploy prod]
:::
EOF
git add docs && git commit -m "Add docs" && git push

az devops wiki create --name "Repo docs" --type codewiki \\
  --repository <repo> --mapped-path /docs --version main`,
      },
      {
        title: 'Failing pipeline for the test',
        language: 'yaml',
        code: `trigger: none
pool:
  vmImage: ubuntu-latest
steps:
  - script: exit 1
    displayName: Fail on purpose`,
      },
    ],
    verification: [
      {
        command: 'az devops wiki list --query "[].{name:name,type:type}" -o table',
        what: 'Confirms the code wiki exists.',
        expected: 'Repo docs  codeWiki',
      },
      {
        command:
          'az devops invoke --area hooks --resource subscriptions --http-method GET --query "value[].eventType"',
        what: 'Confirms the build.complete subscription exists.',
        expected: 'build.complete in the list',
      },
    ],
    cleanup: [
      {
        command: 'az devops wiki delete --wiki "Repo docs" --yes',
        what: 'Unpublishes the code wiki. The Markdown stays in the repository.',
      },
      {
        command: 'az devops project delete --id <project-id> --yes',
        what: 'Deletes the lab project if you created one only for this lab, removing the service hook with it.',
        placeholders: ['<project-id>'],
      },
    ],
  },
  relatedTopicIds: [
    'az4-work-tracking',
    'az4-environments-approvals',
    'az4-app-insights-monitoring',
  ],
  docs: [
    {
      title: 'About wikis, READMEs and Markdown',
      url: 'https://learn.microsoft.com/azure/devops/project/wiki/about-readme-wiki',
    },
    {
      title: 'Publish a Git repository to a wiki',
      url: 'https://learn.microsoft.com/azure/devops/project/wiki/publish-repo-to-wiki',
    },
    {
      title: 'Integrate with service hooks',
      url: 'https://learn.microsoft.com/azure/devops/service-hooks/overview',
    },
    { title: 'About webhooks (GitHub)', url: 'https://docs.github.com/webhooks/about-webhooks' },
    {
      title: 'Automatically generated release notes',
      url: 'https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes',
    },
  ],
}
