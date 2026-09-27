import type { Topic } from '../../../types'

export const workTracking: Topic = {
  id: 'az4-work-tracking',
  title: 'Work tracking, flow of work and DevOps metrics',
  domainId: 'az4-processes',
  difficulty: 'beginner',
  estimatedMinutes: 30,
  order: 1,
  tags: [
    'azure-boards',
    'github-projects',
    'github-issues',
    'github-flow',
    'traceability',
    'dora',
    'cycle-time',
    'lead-time',
    'dashboards',
  ],
  oneLiner:
    'Plan work in Azure Boards or GitHub Projects, link it to commits and pull requests, and measure the flow with lead time, cycle time and the four DORA metrics.',
  explanation: [
    'Every DevOps team needs a single place that answers "what are we working on, and why?". In the Microsoft world that place is either **Azure Boards** (part of Azure DevOps) or **GitHub Issues and GitHub Projects**. Both let you capture work as items, arrange them on boards and backlogs, and track them from idea to production.',
    'Azure Boards organises work into **work item types** defined by a **process**: Basic (Epic, Issue, Task), Agile (Epic, Feature, User Story, Task, Bug), Scrum (Epic, Feature, Product Backlog Item, Task, Bug, Impediment) and CMMI (Epic, Feature, Requirement, Task, Bug, Change Request, Risk, Review). Work items live in **area paths** (which team owns it) and **iteration paths** (which sprint it lands in). GitHub keeps things lighter: an **issue** is the unit of work, labels and milestones classify it, and a **GitHub Project** is a flexible table, board or roadmap view over issues and pull requests from one or many repositories, with custom fields such as Status, Priority, Iteration and Estimate.',
    '**Traceability** is the thread that connects a requirement to the code that implemented it, the build that compiled it and the release that shipped it. In Azure Repos you link work items from commits and pull requests; from GitHub you connect Azure Boards through the **Azure Boards app** and then write `AB#123` in a commit message, PR title or description to link work item 123. Adding a keyword such as `Fixes AB#123` transitions the work item to done when the PR merges into the default branch. Inside GitHub alone, `Closes #42` in a PR description closes issue 42 on merge.',
    'Finally, you measure the flow. **Lead time** runs from when a work item is created to when it is completed; **cycle time** runs from when work actually starts (enters an In Progress category) to completion. The **DORA metrics** add a delivery view: **deployment frequency**, **lead time for changes** (commit to production), **change failure rate** and **time to restore service** (often called mean time to recovery). Azure Boards shows lead and cycle time through Analytics widgets on **dashboards**, and GitHub Projects has built-in **Insights** charts.',
  ],
  whyItMatters: [
    'The AZ-400 "processes and communications" domain expects you to pick the right tool for a flow-of-work requirement, to know how `AB#` linking works between GitHub and Azure Boards, and to know which metric answers which question. Many questions hinge on subtle wording like "from the moment work starts" (cycle time) versus "from the moment it was requested" (lead time).',
    'In practice, traceability is what lets an auditor, a support engineer or a new team member start from a production bug and walk back to the commit, the pull request, the reviewer and the original requirement. Without links, that investigation is guesswork.',
    'Metrics are how a team knows whether a process change actually helped. If you moved from long-lived branches to trunk-based development, deployment frequency and lead time for changes should improve; if change failure rate rose at the same time, you shipped faster but broke more.',
  ],
  howItWorks: [
    'An Azure DevOps **organization** contains **projects**. Each project uses one **process** (inherited from Basic, Agile, Scrum or CMMI) that defines its work item types, states and fields. You customise an **inherited process** by adding fields, states or types; the change applies to every project using it.',
    'Work item states map to **state categories**: Proposed, In Progress, Resolved, Completed and Removed. Boards columns, burndown charts and the lead and cycle time calculations all use these categories rather than the literal state names, which is why custom states must be mapped correctly.',
    '**Backlogs** show a prioritised list per level (Epics, Features, Stories). **Boards** are Kanban views with columns, WIP limits, swimlanes and a Definition of Done per column. **Sprints** show the work planned for the current iteration with capacity and burndown. **Queries** (flat, tree or direct links) filter work items with WIQL and can feed charts on dashboards.',
    '**GitHub Flow** is the lightweight branching model that pairs with this: create a short-lived branch from `main`, commit, open a pull request, discuss and review, let CI run, deploy (often from the branch or immediately after merge), then merge and delete the branch. `main` is always deployable.',
    'To link GitHub to Azure Boards, install the **Azure Boards app** from the GitHub Marketplace and connect the repositories to an Azure DevOps project (Project settings, GitHub connections). After that, `AB#<id>` mentions in commits, PRs and issues create links on the work item, and the work item development section shows the GitHub commits and pull requests. Build status can be shown on a GitHub README with an Azure Boards badge.',
    'Dashboards are per-team or per-project pages of **widgets**: Lead Time, Cycle Time, Cumulative Flow Diagram, Velocity, Burndown, query tiles and charts, and pipeline widgets such as build history and test results. For DORA metrics, you usually combine pipeline data (deployment frequency, failed deployments) with work item data, via the Analytics service, OData feeds or Power BI.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'GitHub Flow with traceability',
      caption:
        'Each step leaves a link behind: the branch and PR reference the work item, the merge closes it and the pipeline records the deployment.',
      nodes: [
        {
          label: 'Work item or issue created',
          detail: 'Azure Boards story or GitHub issue',
          tone: 'accent',
        },
        {
          label: 'Short-lived branch from main',
          detail: 'feature/123-login-timeout',
          arrowLabel: 'work starts',
        },
        {
          label: 'Commits mention AB#123',
          detail: 'Links appear on the work item',
        },
        {
          label: 'Pull request with review and CI',
          detail: 'Fixes AB#123 in the description',
          branch: {
            label: 'Checks fail',
            detail: 'Fix on the branch and push again',
            tone: 'danger',
          },
        },
        {
          label: 'Merge to main and deploy',
          detail: 'Work item moves to Done',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Which flow metric answers the question',
      caption:
        'Read where the clock starts. Created means lead time, started means cycle time, commit means lead time for changes.',
      question: 'Where does the clock start and stop?',
      branches: [
        {
          condition: 'From request created to done',
          result: 'Lead time',
          detail: 'What the customer experiences',
          tone: 'accent',
        },
        {
          condition: 'From work started to done',
          result: 'Cycle time',
          detail: 'How fast the team executes',
        },
        {
          condition: 'From commit to running in production',
          result: 'Lead time for changes (DORA)',
          detail: 'Pipeline and release efficiency',
        },
        {
          condition: 'From outage start to service restored',
          result: 'Time to restore service (DORA)',
          detail: 'Also called mean time to recovery',
          tone: 'warning',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Work item (Azure Boards)',
      purpose:
        'The unit of tracked work in Azure DevOps. Its type, fields and allowed states come from the project process.',
      fields: [
        {
          path: 'System.WorkItemType',
          meaning: 'User Story, Bug, Task, Feature, Epic and so on.',
          required: true,
        },
        {
          path: 'System.State',
          meaning: 'Current state, mapped to a state category such as In Progress.',
        },
        { path: 'System.AreaPath', meaning: 'Which team or product area owns the item.' },
        {
          path: 'System.IterationPath',
          meaning: 'Which sprint or iteration the item is planned into.',
        },
        {
          path: 'Links (Development)',
          meaning: 'Branches, commits, pull requests and builds linked to the item.',
        },
      ],
    },
    {
      kind: 'GitHub Project (Projects)',
      purpose:
        'A table, board or roadmap over issues and pull requests, possibly spanning several repositories, with custom fields and automation workflows.',
      fields: [
        { path: 'Status field', meaning: 'Single-select field that drives the board columns.' },
        { path: 'Iteration field', meaning: 'Time-boxed iterations, like sprints.' },
        {
          path: 'Workflows',
          meaning: 'Built-in automation, for example set Status to Done when an issue closes.',
        },
        {
          path: 'Insights',
          meaning: 'Charts such as burn up and status over time, built from project fields.',
        },
      ],
    },
    {
      kind: 'DORA metrics',
      purpose: 'Four research-backed measures of software delivery performance.',
      fields: [
        {
          path: 'Deployment frequency',
          meaning: 'How often you successfully release to production.',
        },
        {
          path: 'Lead time for changes',
          meaning: 'Time from commit to that commit running in production.',
        },
        {
          path: 'Change failure rate',
          meaning: 'Percentage of deployments that cause a failure needing remediation.',
        },
        {
          path: 'Time to restore service',
          meaning: 'How long it takes to recover from a production failure.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'The bug nobody could trace',
    story: [
      'A retail team shipped a checkout change on a Thursday. By Monday, refunds were failing for one payment provider. The support lead asked the obvious questions: which change did this, who reviewed it, and what requirement was it for? Nobody could answer quickly, because commits said things like "fix stuff" and the Jira-style board lived in a spreadsheet.',
      'The team moved to Azure Boards connected to their GitHub repositories with the Azure Boards app. They adopted a simple rule enforced by a PR template: every pull request description includes `AB#<id>`, and the GitHub branch protection requires review and a passing build.',
      'Two months later a similar regression appeared. From the Bug work item they opened the linked story, saw the linked PR, the reviewer, the exact commits and the pipeline run that deployed it. Rollback took twenty minutes instead of a weekend.',
      'Their dashboard now shows cycle time, a cumulative flow diagram and deployment counts per week. When cycle time spiked, the CFD showed work piling up in the Code Review column, so they added a WIP limit and paired reviewers, and cycle time fell back within two sprints.',
    ],
  },
  yamlExamples: [
    {
      title: 'Pipeline that links runs to work items',
      language: 'yaml',
      explanation:
        'Azure Pipelines automatically links work items associated with the commits in a run. This pipeline builds on main, and the deployment to the production environment is what you count for deployment frequency.',
      code: `trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

stages:
  - stage: Build
    jobs:
      - job: Build
        steps:
          - script: npm ci && npm test
            displayName: Install and test

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployProd
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying build $(Build.BuildNumber)"`,
    },
    {
      title: 'GitHub pull request template that enforces traceability',
      language: 'text',
      explanation:
        'Saved as .github/pull_request_template.md. Reviewers can reject a PR that does not reference a work item, and the AB# mention is picked up by the Azure Boards app.',
      code: `## What and why

Describe the change.

## Work item

Fixes AB#<work-item-id>

## Checklist

- [ ] Tests added or updated
- [ ] Docs updated if behaviour changed`,
    },
    {
      title: 'Mermaid view of the GitHub Flow',
      language: 'text',
      explanation: 'Mermaid gitGraph syntax, renderable in GitHub Markdown and Azure DevOps wikis.',
      code: `gitGraph
  commit id: "main"
  branch feature/123-login
  checkout feature/123-login
  commit id: "AB#123 add timeout"
  commit id: "AB#123 tests"
  checkout main
  merge feature/123-login id: "PR merged"
  commit id: "deploy"`,
    },
  ],
  imperative: [
    {
      command:
        'az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>',
      what: 'Sets the default organization and project so later az boards commands are shorter.',
      expected: 'No output; later commands stop asking for --org and --project.',
      placeholders: ['<org>', '<project>'],
    },
    {
      command:
        'az boards work-item create --type "User Story" --title "Add login timeout" --area "<project>\\Web"',
      what: 'Creates a user story in the Web area path.',
      expected: 'JSON for the new work item including its numeric id.',
      placeholders: ['<project>'],
    },
    {
      command:
        'az boards work-item update --id <id> --state Active --assigned-to <user@contoso.com>',
      what: 'Moves the work item into an In Progress state and assigns it, which starts the cycle time clock.',
      placeholders: ['<id>', '<user@contoso.com>'],
    },
    {
      command:
        'az boards iteration project create --name "Sprint 1" --start-date 2026-10-05 --finish-date 2026-10-16',
      what: 'Creates an iteration that teams can plan into.',
    },
    {
      command:
        'gh issue create --title "Login times out too early" --label bug --project "Web roadmap"',
      what: 'Creates a GitHub issue and adds it to a GitHub Project in one step.',
      expected: 'The URL of the new issue.',
    },
    {
      command: 'git commit -m "Increase session timeout, fixes AB#<id>"',
      what: 'A commit message that links, and on merge to the default branch resolves, the Azure Boards work item.',
      placeholders: ['<id>'],
    },
  ],
  declarative: {
    steps: [
      'Create or choose a project and its process (Agile is the common default).',
      'Define area paths per team and iteration paths per sprint.',
      'Install the Azure Boards app on the GitHub organization and connect the repositories.',
      'Add a PR template that requires an AB# reference.',
      'Build a team dashboard with Lead Time, Cycle Time, Cumulative Flow and deployment widgets.',
    ],
    code: [
      {
        title: 'Scripted project setup with Azure DevOps CLI',
        language: 'bash',
        explanation:
          'A repeatable bootstrap. Keeping it as a script in a repository means new teams get the same structure every time.',
        code: `az extension add --name azure-devops
az devops configure --defaults organization=https://dev.azure.com/<org>

az devops project create --name web-shop --process Agile --source-control git
az devops configure --defaults project=web-shop

az boards area project create --name Web
az boards area project create --name Payments
az boards iteration project create --name "Sprint 1" \\
  --start-date 2026-10-05 --finish-date 2026-10-16

az boards work-item create --type Epic --title "Checkout reliability"`,
      },
      {
        title: 'GitHub Projects automation with Actions',
        language: 'yaml',
        explanation:
          'Adds every new issue labelled bug to a project. Uses the official actions/add-to-project action and a token stored as a secret.',
        code: `name: Add bugs to project
on:
  issues:
    types: [opened, labeled]

jobs:
  add:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@v1
        with:
          project-url: https://github.com/orgs/<org>/projects/<number>
          github-token: \${{ secrets.PROJECT_TOKEN }}
          labeled: bug`,
      },
    ],
  },
  verification: [
    {
      command: 'az boards work-item show --id <id> --expand relations -o json',
      what: 'Shows the work item with its links, including ArtifactLink relations to commits and pull requests.',
      expected: 'A relations array containing vstfs:///Git/Commit or GitHub commit links.',
      placeholders: ['<id>'],
    },
    {
      command:
        'az boards query --wiql "SELECT [System.Id],[System.Title] FROM WorkItems WHERE [System.State] = \'Active\'"',
      what: 'Runs a WIQL query to list active work items.',
    },
    {
      command: 'gh project item-list <number> --owner <org> --format json',
      what: 'Lists the items in a GitHub Project with their field values.',
    },
  ],
  troubleshooting: [
    {
      command: 'az boards work-item show --id <id> --fields System.State',
      what: 'An AB# link appeared but the item did not close: check the state. Only mentions with fix keywords in PRs merged to the default branch transition it.',
      placeholders: ['<id>'],
    },
    {
      command: 'gh api repos/<owner>/<repo>/installation',
      what: 'Confirms whether a GitHub App (such as Azure Boards) is installed on the repository. A 404 means AB# mentions will not link.',
      placeholders: ['<owner>', '<repo>'],
    },
    {
      command:
        'az devops invoke --area wit --resource workitemtypes --route-parameters project=<project>',
      what: 'Lists work item types in the project, useful when a create fails because the process has no such type (for example "User Story" in a Scrum project).',
      placeholders: ['<project>'],
    },
  ],
  commonMistakes: [
    'Confusing lead time with cycle time. Lead time starts when the item is created; cycle time starts when work enters an In Progress category.',
    'Adding custom board states without mapping them to the right state category, which silently breaks cycle time and burndown charts.',
    'Using `#123` in a GitHub commit and expecting it to link to Azure Boards. The Azure Boards syntax is `AB#123`.',
    'Measuring team performance on velocity alone. Velocity is a planning aid, not a productivity score, and it is not comparable across teams.',
    'Choosing the Scrum process and then scripting `--type "User Story"`. In Scrum the type is Product Backlog Item.',
  ],
  examTips: [
    'Memorise the four DORA metrics and which are throughput (deployment frequency, lead time for changes) versus stability (change failure rate, time to restore).',
    'If a scenario says "link GitHub commits to Azure Boards work items", the answer involves the Azure Boards app and `AB#` mentions.',
    'A Cumulative Flow Diagram shows bottlenecks: a band that keeps widening is where work is piling up.',
    'Know the work item types per process, especially Agile (User Story) versus Scrum (Product Backlog Item) versus Basic (Issue).',
    'GitHub Flow is branch, commit, PR, review, deploy, merge. It has no long-lived develop or release branches.',
  ],
  summary: [
    'Azure Boards and GitHub Projects both track work; Boards is richer and process-driven, Projects is lighter and issue-driven.',
    'Traceability links requirements to commits, PRs, builds and releases, using `AB#` from GitHub or native links in Azure Repos.',
    'Lead time starts at creation, cycle time at start of work; both come from state categories.',
    'DORA metrics measure delivery throughput and stability; dashboards and Insights make them visible.',
    'GitHub Flow keeps main deployable with short-lived branches and PR reviews.',
  ],
  practice: [
    {
      id: 'az4-work-tracking-p1',
      level: 'beginner',
      prompt:
        'A manager asks how long customers wait from requesting a feature until it is delivered. Which metric answers that?',
      answer:
        'Lead time, because it starts when the work item is created and ends when it is completed.',
      explanation:
        'Cycle time would exclude the time the request sat in the backlog, which the customer still experienced as waiting.',
    },
    {
      id: 'az4-work-tracking-p2',
      level: 'beginner',
      prompt:
        'Write a commit message that links a GitHub commit to Azure Boards work item 481 and resolves it when merged.',
      answer:
        'Something like "Fix rounding in totals, fixes AB#481", with the Azure Boards app connected to the repository.',
      explanation:
        'The AB# prefix targets Azure Boards; the fixes keyword transitions the item when the change reaches the default branch.',
    },
    {
      id: 'az4-work-tracking-p3',
      level: 'intermediate',
      prompt:
        'Your team added a "Waiting for QA" column, and since then the cycle time widget shows odd results. What is the likely cause?',
      answer:
        'The new state was mapped to the wrong state category, for example Proposed instead of In Progress, so items appear to leave and re-enter work.',
      explanation:
        'Analytics computes cycle time from state categories, not column names, so every custom state must map to the category that matches its meaning.',
    },
    {
      id: 'az4-work-tracking-p4',
      level: 'intermediate',
      prompt: 'Which two DORA metrics describe stability rather than throughput?',
      answer: 'Change failure rate and time to restore service.',
      explanation:
        'Deployment frequency and lead time for changes describe throughput; the other two describe how often and how badly changes fail.',
    },
  ],
  lab: {
    title: 'Connect GitHub to Azure Boards and trace a change end to end',
    scenario:
      'Create an Azure Boards project, connect a GitHub repository, and prove that a commit and pull request link back to, and close, a work item.',
    prerequisites: [
      'A free Azure DevOps organization (dev.azure.com)',
      'A GitHub account with a personal repository',
      'Azure CLI with the azure-devops extension, and the gh CLI',
    ],
    tasks: [
      { instruction: 'Create an Azure DevOps project called `trace-lab` using the Agile process.' },
      {
        instruction: 'Create a User Story titled "Add health endpoint" and note its id.',
        hint: 'az boards work-item create --type "User Story"',
      },
      {
        instruction:
          'Install the Azure Boards app on your GitHub account and connect your repository to `trace-lab`.',
        hint: 'Project settings, Boards, GitHub connections.',
      },
      {
        instruction:
          'Create a branch, commit a small change with `AB#<id>` in the message, and push it.',
      },
      {
        instruction:
          'Open a pull request whose description contains `Fixes AB#<id>`, then merge it into main.',
      },
      {
        instruction:
          'Open the work item and confirm the Development section lists the commit and PR, and the state is Closed.',
      },
      { instruction: 'Add a Cycle Time widget to the team dashboard.' },
    ],
    solution: [
      {
        title: 'Create the project and work item',
        language: 'bash',
        code: `az devops configure --defaults organization=https://dev.azure.com/<org>
az devops project create --name trace-lab --process Agile
az devops configure --defaults project=trace-lab
az boards work-item create --type "User Story" --title "Add health endpoint" --query id`,
      },
      {
        title: 'Branch, commit and PR from GitHub',
        language: 'bash',
        code: `git switch -c feature/health
echo "ok" > health.txt
git add health.txt
git commit -m "Add health endpoint AB#<id>"
git push -u origin feature/health

gh pr create --title "Add health endpoint" --body "Fixes AB#<id>"
gh pr merge --squash --delete-branch`,
      },
    ],
    verification: [
      {
        command:
          'az boards work-item show --id <id> --expand relations --query "fields.\\"System.State\\""',
        what: 'Confirms the state changed after the merge.',
        expected: '"Closed"',
      },
      {
        command:
          'az boards work-item show --id <id> --expand relations --query "relations[].attributes.name"',
        what: 'Lists the link types on the item.',
        expected: 'GitHub Commit and GitHub Pull Request entries.',
      },
    ],
    cleanup: [
      {
        command:
          'az devops project delete --id $(az devops project show --project trace-lab --query id -o tsv) --yes',
        what: 'Deletes the lab project and its work items.',
      },
      {
        command: 'gh repo delete <owner>/<repo> --yes',
        what: 'Deletes the practice repository if you created one only for this lab.',
      },
    ],
  },
  relatedTopicIds: ['az4-docs-integration', 'az4-branching-pr', 'az4-pipeline-maintenance'],
  docs: [
    {
      title: 'What is Azure Boards?',
      url: 'https://learn.microsoft.com/azure/devops/boards/get-started/what-is-azure-boards',
    },
    {
      title: 'Link GitHub commits and pull requests to work items',
      url: 'https://learn.microsoft.com/azure/devops/boards/github/link-to-from-github',
    },
    {
      title: 'Cycle time and lead time widgets',
      url: 'https://learn.microsoft.com/azure/devops/report/dashboards/cycle-time-and-lead-time',
    },
    {
      title: 'About Projects (GitHub)',
      url: 'https://docs.github.com/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects',
    },
  ],
}
