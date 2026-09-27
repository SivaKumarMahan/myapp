import type { InterviewQuestion } from '../../../types'

/** Multiple-choice questions from the Deloitte online round. */
export const roundsDeloitteChoiceQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rdel-4',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'When using DevOps methodology for product development, what is the correct sequence to be followed?',
    promptCode: [
      {
        title: 'Given steps',
        language: 'text',
        code: `1. Build the package with all necessary configurations
2. Test the project at each level and integrate it
3. Commit all code by using source control
4. Release the first version of the product
5. Bring the product into operation
6. Deploy the build in production server`,
      },
    ],
    options: [
      { id: 'a', text: '1 -> 2 -> 3 -> 4 -> 6 -> 5' },
      { id: 'b', text: '6 -> 2 -> 3 -> 1 -> 4 -> 5' },
      { id: 'c', text: '5 -> 6 -> 3 -> 1 -> 4 -> 2' },
      { id: 'd', text: '2 -> 3 -> 4 -> 6 -> 5 -> 1' },
    ],
    correct: ['a'],
    probing:
      'Whether you know the order of the DevOps lifecycle stages from build through operation.',
    answer: [
      '**Correct answer:** `1 -> 2 -> 3 -> 4 -> 6 -> 5` **Why**:',
      '1. Build the package with required configurations\n2. Test the project at each level and integrate it\n3. Commit code to source control\n4. Release the first version of the product\n5. Deploy the build to the production server\n6. Bring the product into operation',
    ],
    tags: ['devops', 'lifecycle'],
  },
  {
    id: 'itv-rdel-5',
    level: 'basic',
    kind: 'mcq',
    prompt: 'What is the purpose of GitLab Environments in CI/CD?',
    options: [
      { id: '1', text: 'To configure access control for CI/CD pipelines' },
      { id: '2', text: 'To specify the platforms on which the application is deployed' },
      {
        id: '3',
        text: 'To manage different deployment environments (e.g. development, staging, production)',
      },
      { id: '4', text: 'To define the geographical regions where GitLab Runners are deployed' },
    ],
    correct: ['3'],
    probing: 'Whether you know GitLab Environments track deployment targets and their history.',
    answer: [
      '**Correct answer: Option 3** — To manage different deployment environments (development, staging, production)',
      '**Explanation** - GitLab Environments represent the different places where your application is deployed, such as:',
      '- Development\n- Testing\n- Staging\n- Production',
      'They help to track deployments, deployment history, and environment status.',
    ],
    tags: ['gitlab', 'ci/cd', 'environments'],
  },
  {
    id: 'itv-rdel-6',
    level: 'basic',
    kind: 'mcq',
    prompt: 'Which of the options given below is the correct AWS DevOps tools workflow?',
    options: [
      { id: '1', text: 'X-Ray -> CodeCommit -> CodeBuild -> CloudWatch' },
      { id: '2', text: 'CodePipeline -> CodeCommit -> CodeBuild -> CodeDeploy' },
      { id: '3', text: 'CodePipeline -> CloudWatch -> CodeBuild -> CodeDeploy' },
      { id: '4', text: 'CloudWatch -> CodeCommit -> X-Ray -> CodeDeploy' },
    ],
    correct: ['2'],
    probing:
      'Whether you can place the AWS developer tools in a CI/CD chain and tell them apart from the monitoring tools.',
    answer: [
      '**Correct answer: Option 2** — CodePipeline -> CodeCommit -> CodeBuild -> CodeDeploy **Explanation**:',
      '- **CodePipeline** - orchestrates the whole CI/CD flow\n- **CodeCommit** - source code repository\n- **CodeBuild** - builds and tests the code\n- **CodeDeploy** - deploys the build to the servers',
      'CloudWatch and X-Ray are monitoring tools, not part of the build and deploy chain.',
    ],
    tags: ['aws', 'ci/cd'],
  },
  {
    id: 'itv-rdel-7',
    level: 'basic',
    kind: 'mcq',
    prompt: 'What is an Azure DevOps Service Connection used for?',
    options: [
      { id: '1', text: 'Connecting Azure DevOps to an on-premises SQL database' },
      { id: '2', text: 'Authenticating pipelines to external services like Azure and GitHub' },
      { id: '3', text: 'Sharing artifacts between different DevOps organizations' },
      { id: '4', text: 'Linking Azure DevOps boards to user email accounts' },
    ],
    correct: ['2'],
    probing:
      'Whether you know a service connection is how a pipeline authenticates to external services without credentials in YAML.',
    answer: [
      '**Correct answer: Option 2** — Authenticating pipelines to external services like Azure and GitHub',
      '**Explanation** - An Azure DevOps Service Connection stores the authentication and configuration details a pipeline needs to securely connect to external services such as:',
      '- Azure subscriptions\n- Docker registries\n- GitHub\n- Kubernetes clusters',
    ],
    tags: ['azure devops', 'service connections'],
  },
  {
    id: 'itv-rdel-8',
    level: 'basic',
    kind: 'mcq',
    prompt: 'Which Azure Monitor component collects telemetry from applications automatically?',
    options: [
      { id: '1', text: 'Data Factory' },
      { id: '2', text: 'Azure Batch' },
      { id: '3', text: 'Azure Advisor' },
      { id: '4', text: 'Application Insights' },
    ],
    correct: ['4'],
    probing:
      'Whether you know which Azure Monitor feature is the application performance monitoring piece.',
    answer: [
      '**Correct answer: Option 4** — Application Insights',
      '**Explanation** - Application Insights collects application telemetry such as:',
      '- Requests\n- Exceptions\n- Response times\n- Dependencies\n- Performance metrics',
    ],
    tags: ['azure monitor', 'application insights'],
  },
]
