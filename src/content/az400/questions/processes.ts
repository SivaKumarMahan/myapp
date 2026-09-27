import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az400ProcessesQuestions: Question[] = [
  {
    id: 'az4q-prc-1',
    domainId: 'az4-processes',
    topicId: 'az4-work-tracking',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A product owner wants to know how long, on average, a customer request waits from the moment it is logged until it is delivered. Which metric should you show on the dashboard?',
    options: [
      { id: 'a', text: 'Cycle time' },
      { id: 'b', text: 'Lead time' },
      { id: 'c', text: 'Velocity' },
      { id: 'd', text: 'Deployment frequency' },
    ],
    correct: ['b'],
    explanation:
      'Lead time runs from creation of the work item to completion, which is what the requester experiences. Cycle time only starts when work begins, velocity is story points per sprint, and deployment frequency counts releases rather than the wait for a single item.',
  },
  {
    id: 'az4q-prc-2',
    domainId: 'az4-processes',
    topicId: 'az4-work-tracking',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Your code is in GitHub and your backlog is in Azure Boards. Developers want commits and pull requests to appear on the related work items automatically. What should you do?',
    options: [
      {
        id: 'a',
        text: 'Install the Azure Boards app for GitHub, connect the repositories, and reference work items with AB#<id>',
      },
      {
        id: 'b',
        text: 'Create a GitHub webhook that posts every push to the Azure DevOps REST API',
      },
      { id: 'c', text: 'Mirror the GitHub repository into Azure Repos every night' },
      { id: 'd', text: 'Reference work items with #<id> in commit messages' },
    ],
    correct: ['a'],
    explanation:
      'The Azure Boards app creates the GitHub connection and AB# mentions create links on work items. A custom webhook would require you to build the linking yourself, mirroring adds delay and a second source of truth, and #<id> refers to GitHub issues, not Azure Boards items.',
  },
  {
    id: 'az4q-prc-3',
    domainId: 'az4-processes',
    topicId: 'az4-work-tracking',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which of the following are among the four DORA metrics? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Deployment frequency' },
      { id: 'b', text: 'Change failure rate' },
      { id: 'c', text: 'Code coverage percentage' },
      { id: 'd', text: 'Time to restore service' },
      { id: 'e', text: 'Sprint velocity' },
    ],
    correct: ['a', 'b', 'd'],
    explanation:
      'The four DORA metrics are deployment frequency, lead time for changes, change failure rate and time to restore service. Code coverage is a quality signal and velocity a planning aid; neither is a DORA metric.',
  },
  {
    id: 'az4q-prc-4',
    domainId: 'az4-processes',
    topicId: 'az4-work-tracking',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A team added a custom state "In Review" to User Stories. Since then, the Cycle Time widget shows many items with near-zero cycle time. What is the most likely cause?',
    options: [
      { id: 'a', text: 'The Analytics service needs to be re-enabled after any process change' },
      {
        id: 'b',
        text: 'The new state was mapped to the Proposed or Completed state category instead of In Progress',
      },
      { id: 'c', text: 'Cycle time can only be calculated for Bug work items' },
      { id: 'd', text: 'The widget counts calendar days only for Scrum projects' },
    ],
    correct: ['b'],
    explanation:
      'Analytics derives cycle time from state categories. A working state mapped to the wrong category makes items appear to leave and restart work. Analytics does not need re-enabling, cycle time works for every backlog type, and the calculation does not depend on the process.',
  },
  {
    id: 'az4q-prc-5',
    domainId: 'az4-processes',
    topicId: 'az4-work-tracking',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt: 'Which sequence best describes GitHub Flow?',
    options: [
      { id: 'a', text: 'Branch from develop, merge to release, then merge release to main' },
      {
        id: 'b',
        text: 'Branch from main, commit, open a pull request, review and test, merge to main and deploy',
      },
      { id: 'c', text: 'Commit directly to main and tag each release' },
      { id: 'd', text: 'Fork the repository for every change and never merge back' },
    ],
    correct: ['b'],
    explanation:
      'GitHub Flow uses short-lived branches off main and pull requests; main is always deployable. Option a describes GitFlow, c skips review entirely, and d is not a workflow for a team repository.',
  },
  {
    id: 'az4q-prc-6',
    domainId: 'az4-processes',
    topicId: 'az4-work-tracking',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Using the Azure DevOps CLI with defaults already configured, create a Bug work item titled "Checkout fails".',
    acceptedAnswers: [
      'az boards work-item create --type Bug --title "Checkout fails"',
      'az boards work-item create --title "Checkout fails" --type Bug',
      "az boards work-item create --type bug --title 'checkout fails'",
    ],
    answerHint: 'az boards work-item ...',
    explanation:
      '`az boards work-item create` requires --type and --title. Organization and project come from `az devops configure --defaults` or from --org and --project.',
  },
  {
    id: 'az4q-prc-7',
    domainId: 'az4-processes',
    topicId: 'az4-docs-integration',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Your team wants documentation changes to go through pull requests with the same branch policies as code, and to publish separate docs for each release branch. Which option should you use?',
    options: [
      { id: 'a', text: 'The Azure DevOps project wiki' },
      { id: 'b', text: 'A code wiki published from a folder in a Git repository' },
      { id: 'c', text: 'Work item descriptions on each Epic' },
      { id: 'd', text: 'A dashboard Markdown widget' },
    ],
    correct: ['b'],
    explanation:
      'Publishing a repository folder as a code wiki makes docs normal files under branch policies, and additional branches can be published as wiki versions. The project wiki is edited in the browser without PR review, while work items and dashboard widgets are not documentation systems.',
  },
  {
    id: 'az4q-prc-8',
    domainId: 'az4-processes',
    topicId: 'az4-docs-integration',
    kind: 'mcq',
    category: 'yaml',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which syntax renders a Mermaid diagram on an Azure DevOps wiki page?',
    options: [
      { id: 'a', text: 'A block that starts with ::: mermaid and ends with :::' },
      { id: 'b', text: 'An HTML <mermaid> tag' },
      { id: 'c', text: 'A [[_MERMAID_]] macro followed by the diagram' },
      { id: 'd', text: 'An image link to a .mmd file in the repository' },
    ],
    correct: ['a'],
    explanation:
      'Azure DevOps wikis use the triple-colon container ::: mermaid ... :::. GitHub uses a fenced code block labelled mermaid instead. There is no mermaid HTML tag or _MERMAID_ macro, and linking a .mmd file shows it as a file rather than rendering it.',
  },
  {
    id: 'az4q-prc-9',
    domainId: 'az4-processes',
    topicId: 'az4-docs-integration',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You need a Microsoft Teams channel to be notified when a production deployment in Azure Pipelines fails. Which approaches work? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Subscribe the channel with the Azure Pipelines app for Microsoft Teams, filtered to the pipeline and failed status',
      },
      {
        id: 'b',
        text: 'Create a service hook subscription for the run or deployment completed event that posts to a Teams workflow webhook URL',
      },
      {
        id: 'c',
        text: 'Add a final job with condition failed() that posts to the channel webhook',
      },
      { id: 'd', text: 'Enable branch policy build validation on main' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'The Teams app, a service hook to a webhook, or an explicit notify job all deliver failure notifications. Build validation is a pull request gate and does not send notifications to Teams.',
  },
  {
    id: 'az4q-prc-10',
    domainId: 'az4-processes',
    topicId: 'az4-docs-integration',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'An internal service receives GitHub webhook deliveries. Security asks how the service can prove each request genuinely came from GitHub. What should you implement?',
    options: [
      { id: 'a', text: 'Allow only requests whose User-Agent header starts with GitHub-Hookshot' },
      {
        id: 'b',
        text: 'Configure a webhook secret and validate the X-Hub-Signature-256 HMAC of the raw payload',
      },
      { id: 'c', text: 'Require the payload to include the repository full name' },
      { id: 'd', text: 'Store a personal access token in the payload URL query string' },
    ],
    correct: ['b'],
    explanation:
      'GitHub signs each delivery with HMAC SHA-256 using the shared secret; validating it proves authenticity and integrity. Headers and repository names are trivially forged, and putting a token in the URL leaks a credential and proves nothing about the sender.',
  },
  {
    id: 'az4q-prc-11',
    domainId: 'az4-processes',
    topicId: 'az4-docs-integration',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'With the GitHub CLI, create a release for tag v2.0.0 whose notes are generated automatically from merged pull requests.',
    acceptedAnswers: [
      'gh release create v2.0.0 --generate-notes',
      'gh release create --generate-notes v2.0.0',
    ],
    answerHint: 'gh release ...',
    explanation:
      '`gh release create <tag> --generate-notes` uses GitHub automatically generated release notes, which can be grouped by label with .github/release.yml.',
  },
  {
    id: 'az4q-prc-12',
    domainId: 'az4-processes',
    topicId: 'az4-work-tracking',
    kind: 'task',
    category: 'lab',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Set up traceability between a GitHub repository and Azure Boards so that merging a pull request automatically closes the linked User Story, and show cycle time on the team dashboard.',
    context:
      'A free Azure DevOps organization with an Agile project, and a GitHub repository you administer.',
    checkpoints: [
      {
        id: 'c1',
        text: 'The Azure Boards app is installed and the repository is connected to the project',
      },
      {
        id: 'c2',
        text: 'A pull request description contains Fixes AB#<id> and has been merged to the default branch',
      },
      {
        id: 'c3',
        text: 'The User Story shows the commit and pull request links and is in a Closed state',
      },
      { id: 'c4', text: 'The team dashboard has a Cycle Time widget' },
    ],
    solution: [
      {
        title: 'Create the story and link it',
        language: 'bash',
        code: `az boards work-item create --type "User Story" --title "Add health endpoint" --query id
# Install Azure Boards app from GitHub Marketplace, connect repo in Project settings > GitHub connections
git switch -c feature/health
git commit --allow-empty -m "Add health endpoint AB#<id>"
git push -u origin feature/health
gh pr create --title "Health endpoint" --body "Fixes AB#<id>"
gh pr merge --squash --delete-branch
az boards work-item show --id <id> --query "fields.\\"System.State\\""`,
      },
    ],
    explanation:
      'AB# links require the Azure Boards app connection; a fix keyword such as Fixes in a PR merged to the default branch transitions the work item. The Cycle Time widget is added from the dashboard widget catalog.',
  },
]
