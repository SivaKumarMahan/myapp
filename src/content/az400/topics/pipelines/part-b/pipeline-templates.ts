import type { Topic } from '../../../../types'

export const az4PipelineTemplates: Topic = {
  id: 'az4-pipeline-templates',
  title: 'YAML templates, parameters, variables and expressions',
  domainId: 'az4-pipelines',
  difficulty: 'advanced',
  estimatedMinutes: 35,
  order: 6,
  tags: [
    'templates',
    'extends',
    'parameters',
    'variables',
    'variable groups',
    'expressions',
    'task groups',
  ],
  oneLiner:
    'Write a pipeline once as templates, pass it typed parameters, and know exactly when each of the three expression syntaxes is evaluated.',
  explanation: [
    'A **YAML template** is a separate YAML file that holds a reusable piece of a pipeline: a list of steps, one or more jobs, one or more stages, or a block of variables. A pipeline pulls it in with the `template:` keyword, and Azure Pipelines pastes the template contents into the pipeline before anything runs. Instead of forty repositories each carrying their own copy of "restore, build, test, publish", they all reference one template in a shared repository.',
    'There are two ways to use a template. **Includes** insert a template at a point in your pipeline (`- template: steps/build.yml` under `steps:`). **Extends** turns the relationship around: your whole pipeline becomes a set of parameters handed to a template that controls the overall structure (`extends: template: secure-pipeline.yml`). Extends is the security feature: combined with the **Required template** check, it lets a platform team guarantee that every pipeline deploying to production runs their scanning and approval stages.',
    '**Parameters** and **variables** look similar but are processed at different times. Parameters are typed (`string`, `number`, `boolean`, `object`, `step`, `stepList`, `job`, `jobList`, `deployment`, `deploymentList`, `stage`, `stageList`) and are resolved when the YAML is compiled, before the run starts. Variables are always strings, can change while the run is executing, and can come from YAML, the pipeline settings UI, **variable groups** in the Library, or be set by a script with `##vso[task.setvariable]`.',
    'That timing difference is what the three expression syntaxes express. `${{ parameters.env }}` is a **template (compile-time) expression**, evaluated once while the YAML is expanded. `$[ variables.isMain ]` is a **runtime expression**, evaluated when the job or stage is about to run. `$(buildConfiguration)` is **macro syntax**, replaced just before a task executes. Pick the wrong one and your value is either empty or frozen at the wrong moment.',
    '**Task groups** are the classic (designer) equivalent of step templates: a saved sequence of tasks with parameters that classic build and release pipelines can reuse. They do not exist in YAML pipelines. When you migrate from classic to YAML, each task group becomes a step template.',
  ],
  whyItMatters: [
    'The AZ-400 skills outline explicitly lists "create reusable pipeline elements, including YAML templates, task groups, variables and variable groups". Expect questions that show a YAML fragment and ask which expression syntax works, or which template type to use.',
    'Templates are how organisations scale CI/CD. Without them every team drifts: one skips tests, another pins an old SDK, a third deploys without scanning. With a governed extends template, a fix to the security stage lands in every pipeline the next time it runs.',
    'Getting compile-time versus runtime wrong is one of the most common real-world pipeline bugs. A condition using `${{ }}` on a variable set by an earlier script never sees the new value, and nothing tells you why.',
  ],
  howItWorks: [
    'When a run is queued, Azure Pipelines fetches the pipeline YAML and every template it references, including templates in other repositories declared under `resources.repositories`. Templates are always read at the version the run resolves, so pinning `ref: refs/tags/v2` gives you a stable template contract.',
    'The compiler expands the file: it substitutes `${{ parameters.x }}`, evaluates `${{ if }}`, `${{ elseif }}`, `${{ else }}` and `${{ each }}` directives, and inlines templates recursively. The result is one big "final YAML" that you can download from the run summary (the three-dot menu, "Download full YAML") or request from the preview REST API.',
    'Parameter values are validated at this point. A value outside the `values:` list, or a wrong type, fails the run before any agent is assigned. Runtime parameters declared in the root pipeline also appear as a form when someone clicks "Run pipeline".',
    'Variables are merged next, in order of scope: root, then stage, then job, with later scopes winning. Variable groups referenced with `- group: name` are pulled from the Library; if the group is linked to Azure Key Vault, the secrets are fetched when the job starts. The pipeline must be authorised to use the group, which is itself a protected resource with its own approvals and checks.',
    'When a job starts, runtime expressions `$[ ]` in variables and `condition:` fields are evaluated. They can read `variables`, `dependencies` (job output variables) and `stageDependencies`, which is how a later stage decides whether to run based on an output from an earlier one.',
    'Finally, each task is started. Just before it runs, the agent replaces every `$(name)` macro in its inputs with the current variable value. A macro with no matching variable is left as the literal text `$(name)`, which is often how you notice a typo.',
  ],
  diagrams: [
    {
      kind: 'flow',
      title: 'When each expression syntax is evaluated',
      caption:
        'Template expressions run once at compile time, runtime expressions when a job or stage starts, and macros just before each task.',
      nodes: [
        {
          label: 'Run queued',
          detail: 'YAML and templates fetched',
          tone: 'muted',
        },
        {
          label: 'Compile the YAML',
          detail: '${{ }} parameters, if, each, template includes',
          arrowLabel: 'expand',
          tone: 'accent',
        },
        {
          label: 'Plan stages and jobs',
          detail: 'Final YAML is fixed from here on',
          arrowLabel: 'validate',
        },
        {
          label: 'Job or stage starts',
          detail: '$[ ] runtime expressions and conditions',
          arrowLabel: 'schedule',
          tone: 'warning',
        },
        {
          label: 'Task about to run',
          detail: '$( ) macros replaced in task inputs',
          arrowLabel: 'per task',
          tone: 'success',
        },
      ],
    },
    {
      kind: 'decision',
      title: 'Which template type do you need?',
      caption:
        'Match the template type to the level you want to reuse, and reach for extends when the goal is control rather than convenience.',
      question: 'What are you trying to reuse or enforce?',
      branches: [
        {
          condition: 'A sequence of tasks',
          result: 'Step template',
          detail: 'Inserted under steps; replaces classic task groups',
        },
        {
          condition: 'A whole build or test job',
          result: 'Job template',
          detail: 'Can include pool, strategy and steps',
        },
        {
          condition: 'Build, test and deploy phases',
          result: 'Stage template',
          detail: 'Inserted under stages',
        },
        {
          condition: 'Mandatory structure for every pipeline',
          result: 'Extends template',
          detail: 'Pair with the Required template check',
          tone: 'accent',
        },
        {
          condition: 'Shared names and values',
          result: 'Variable template or group',
          detail: 'Template for plain values, group for secrets',
        },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'YAML template file',
      purpose:
        'A reusable piece of pipeline YAML with its own typed parameters, referenced by path and optionally by repository alias.',
      fields: [
        {
          path: 'parameters[].name / type / default',
          meaning:
            'Typed inputs. A parameter without a default is required. `values:` restricts it to an allowed list.',
          required: true,
        },
        {
          path: 'steps | jobs | stages | variables',
          meaning:
            'The body. A template contains exactly one of these top-level kinds, which decides where it can be inserted.',
          required: true,
        },
        {
          path: 'template: path@alias',
          meaning:
            'How a pipeline references it. `@alias` points at an entry in `resources.repositories` for cross-repository templates.',
        },
        {
          path: 'extends.template',
          meaning:
            'Root-level keyword that makes the pipeline a set of parameters for a controlling template.',
        },
      ],
    },
    {
      kind: 'Variable group (Library)',
      purpose:
        'A named set of variables stored in the project Library, shared across pipelines and optionally linked to an Azure Key Vault.',
      fields: [
        {
          path: 'variables: - group: <name>',
          meaning: 'Pulls the group into the pipeline at that scope.',
        },
        {
          path: 'Linked Key Vault',
          meaning:
            'Secrets are read from Key Vault when the job starts, through a service connection that needs Get and List on secrets.',
        },
        {
          path: 'Pipeline permissions',
          meaning:
            'A group is a protected resource. Each pipeline must be authorised, and approvals and checks can be added.',
        },
      ],
    },
    {
      kind: 'Expression syntaxes',
      purpose: 'Three syntaxes that read values at three different moments in a run.',
      fields: [
        {
          path: '${{ }} template expression',
          meaning:
            'Compile time. Reads parameters and statically defined variables. Supports if, elseif, else and each.',
        },
        {
          path: '$[ ] runtime expression',
          meaning:
            'When the job or stage starts. Reads variables and dependencies outputs. Must be the whole right-hand side of a variable or condition.',
        },
        {
          path: '$( ) macro',
          meaning:
            'Just before a task runs. Only valid in task inputs and script text, not as keys or in conditions.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Forty microservices, one security stage',
    story: [
      'A retail company had forty service repositories, each with its own copy-pasted `azure-pipelines.yml`. When the security team asked for a container image scan before every production deployment, the change took three sprints and several pipelines were quietly never updated.',
      'The platform team moved the build, scan and deploy logic into a `pipeline-templates` repository, tagged it `v1`, and published an extends template that takes the service name, the Dockerfile path and a list of extra test steps as parameters. Each service pipeline shrank to about fifteen lines.',
      'They then added a **Required template** check on the production environment and the production service connection. Any pipeline that did not extend `secure-service.yml@templates` was blocked at the check, so nobody could bypass the scan by writing their own deployment job.',
      'The next policy change - adding a software bill of materials - was a single pull request to the template repository and a new `v1.1` tag. Every service picked it up on its next run.',
    ],
  },
  yamlExamples: [
    {
      title: 'Step template with typed parameters and a loop',
      language: 'yaml',
      explanation:
        'A stepList parameter lets callers inject their own steps. The each loop emits one test step per project at compile time.',
      code: `# templates/steps/dotnet-build.yml
parameters:
  - name: buildConfiguration
    type: string
    default: Release
    values:
      - Debug
      - Release
  - name: testProjects
    type: object
    default: []
  - name: extraSteps
    type: stepList
    default: []

steps:
  - task: UseDotNet@2
    inputs:
      packageType: sdk
      version: 8.x
  - script: dotnet build --configuration \${{ parameters.buildConfiguration }}
    displayName: Build
  - \${{ each project in parameters.testProjects }}:
      - script: dotnet test \${{ project }} --configuration \${{ parameters.buildConfiguration }} --no-build
        displayName: Test \${{ project }}
  - \${{ parameters.extraSteps }}`,
    },
    {
      title: 'Consuming a template from another repository',
      language: 'yaml',
      explanation:
        'The repository resource is pinned to a tag, so a template change never reaches this pipeline until someone bumps the ref.',
      code: `# azure-pipelines.yml in a service repository
resources:
  repositories:
    - repository: templates
      type: git
      name: Platform/pipeline-templates
      ref: refs/tags/v1

trigger:
  branches:
    include:
      - main

pool:
  vmImage: ubuntu-latest

variables:
  - group: shared-build-settings
  - name: isMain
    value: $[ eq(variables['Build.SourceBranch'], 'refs/heads/main') ]

steps:
  - template: steps/dotnet-build.yml@templates
    parameters:
      buildConfiguration: Release
      testProjects:
        - tests/Orders.UnitTests
        - tests/Orders.ContractTests
      extraSteps:
        - script: echo "Branch is main: $(isMain)"`,
    },
    {
      title: 'Extends template that enforces a scan stage',
      language: 'yaml',
      explanation:
        'Callers supply only parameters. The template decides the stages, and the each and if directives rebuild every caller step key by key, turning any inline script key into an invalid key so the run fails to compile.',
      code: `# templates/secure-service.yml
parameters:
  - name: serviceName
    type: string
  - name: buildSteps
    type: stepList
    default: []

stages:
  - stage: Build
    jobs:
      - job: Build
        pool:
          vmImage: ubuntu-latest
        steps:
          - \${{ each step in parameters.buildSteps }}:
              - \${{ each pair in step }}:
                  \${{ if notIn(pair.key, 'script', 'bash', 'powershell', 'pwsh') }}:
                    \${{ pair.key }}: \${{ pair.value }}
                  \${{ else }}:
                    '\${{ pair.key }} steps are not allowed': error
  - stage: Scan
    dependsOn: Build
    jobs:
      - job: ImageScan
        steps:
          - script: echo "Scanning \${{ parameters.serviceName }}"
            displayName: Mandatory container scan`,
    },
    {
      title: 'Runtime parameter plus runtime and compile-time conditions',
      language: 'yaml',
      explanation:
        'The environment parameter is chosen in the Run pipeline form. The Deploy stage is included at compile time only for prod, and runs only if the Build stage output says so.',
      code: `parameters:
  - name: environment
    displayName: Target environment
    type: string
    default: dev
    values:
      - dev
      - prod

stages:
  - stage: Build
    jobs:
      - job: Build
        steps:
          - bash: echo "##vso[task.setvariable variable=shouldDeploy;isOutput=true]true"
            name: gate
  - \${{ if eq(parameters.environment, 'prod') }}:
      - stage: Deploy
        dependsOn: Build
        condition: eq(dependencies.Build.outputs['Build.gate.shouldDeploy'], 'true')
        jobs:
          - job: Deploy
            steps:
              - script: echo "Deploying to \${{ parameters.environment }}"`,
    },
  ],
  imperative: [
    {
      command:
        'az pipelines variable-group create --name shared-build-settings --variables dotnetVersion=8.x buildConfiguration=Release --authorize true --project <project>',
      what: 'Creates a Library variable group and authorises it for all pipelines in the project.',
      expected: 'JSON describing the group, including its numeric id and the two variables.',
      placeholders: ['<project>'],
    },
    {
      command:
        'az pipelines variable-group variable create --group-id <groupId> --name sonarToken --value <value> --secret true --project <project>',
      what: 'Adds a secret variable to an existing group. Secret values are write-only and masked in logs.',
      expected: 'The variable is listed with isSecret true and a null value.',
      placeholders: ['<groupId>', '<value>', '<project>'],
    },
    {
      command:
        'az pipelines run --name orders-ci --branch main --parameters environment=prod --project <project>',
      what: 'Queues a run and supplies a runtime parameter value, exactly like the Run pipeline form.',
      expected: 'A run object with status notStarted or inProgress.',
      placeholders: ['<project>'],
    },
    {
      command:
        'az pipelines run --name orders-ci --variables buildConfiguration=Debug --project <project>',
      what: 'Queues a run and overrides a variable at queue time. Only variables marked settable at queue time accept this.',
      placeholders: ['<project>'],
    },
  ],
  declarative: {
    steps: [
      'Create a `pipeline-templates` repository and put step, job and stage templates in separate folders.',
      'Give every template typed parameters with sensible defaults, and use `values:` to restrict free-text inputs.',
      'Tag releases of the template repository (`v1`, `v1.1`) and pin consumers with `ref: refs/tags/v1`.',
      'Write an extends template for the mandatory structure and add a Required template check to production resources.',
      'Move shared non-secret values to a variable template and secrets to a Key Vault-linked variable group.',
    ],
    code: [
      {
        title: 'Variable template and job template',
        language: 'yaml',
        explanation:
          'Variable templates hold plain values in Git, reviewed like code. The job template shows a job-level parameter feeding the pool and a compile-time if.',
        code: `# templates/variables/common.yml
variables:
  - name: dotnetVersion
    value: 8.x
  - name: artifactName
    value: drop

# templates/jobs/build-job.yml
parameters:
  - name: vmImage
    type: string
    default: ubuntu-latest
  - name: publish
    type: boolean
    default: true

jobs:
  - job: Build
    pool:
      vmImage: \${{ parameters.vmImage }}
    variables:
      - template: ../variables/common.yml
    steps:
      - script: dotnet publish -c Release -o $(Build.ArtifactStagingDirectory)
      - \${{ if eq(parameters.publish, true) }}:
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: $(artifactName)`,
      },
      {
        title: 'Consumer that extends the governed template',
        language: 'yaml',
        code: `resources:
  repositories:
    - repository: templates
      type: git
      name: Platform/pipeline-templates
      ref: refs/tags/v1

trigger:
  - main

extends:
  template: secure-service.yml@templates
  parameters:
    serviceName: orders-api
    buildSteps:
      - task: DotNetCoreCLI@2
        inputs:
          command: build`,
      },
    ],
  },
  verification: [
    {
      command:
        'az pipelines variable-group list --group-name shared-build-settings --project <project> -o table',
      what: 'Confirms the group exists and shows its id.',
      expected: 'One row with the group name and id.',
      placeholders: ['<project>'],
    },
    {
      command:
        'az pipelines runs show --id <runId> --project <project> --query "{status:status,result:result,parameters:templateParameters}"',
      what: 'Shows the result of a run and the template parameter values it was queued with.',
      expected: 'templateParameters lists environment: prod for a run queued with that parameter.',
      placeholders: ['<runId>', '<project>'],
    },
    {
      command:
        'curl -s -u :$AZURE_DEVOPS_EXT_PAT -H "Content-Type: application/json" -d \'{"previewRun":true}\' "https://dev.azure.com/<org>/<project>/_apis/pipelines/<pipelineId>/preview?api-version=7.1" | jq -r .finalYaml',
      what: 'Asks the service to compile the pipeline without running it and prints the fully expanded YAML.',
      expected:
        'The final YAML with every template inlined and every compile-time expression replaced.',
      namespaceNote:
        'The PAT is read from an environment variable you set yourself; never paste it into the pipeline file.',
      placeholders: ['<org>', '<project>', '<pipelineId>'],
    },
  ],
  troubleshooting: [
    {
      command:
        'az pipelines show --name orders-ci --project <project> --query "{yamlFile:process.yamlFilename,repo:repository.name,branch:repository.defaultBranch}"',
      what: 'Confirms which YAML file and branch the pipeline compiles. Then use Download full YAML on the run summary to see what the templates produced.',
      expected:
        'If a step you expected is missing, a compile-time if evaluated to false or a parameter default was used.',
      placeholders: ['<project>'],
    },
    {
      command:
        'az pipelines variable-group show --id <groupId> --project <project> --query "variables"',
      what: 'Checks the variable names in a group when a macro such as $(sonarToken) appears literally in logs.',
      expected: 'The variable name must match exactly, including case in the macro reference.',
      placeholders: ['<groupId>', '<project>'],
    },
    {
      command: 'echo "##vso[task.setvariable variable=isReady;isOutput=true]true"',
      what: 'If a later stage condition never sees an output variable, confirm the step has a name and isOutput=true.',
      expected:
        "The consumer reads it as stageDependencies.<stage>.<job>.outputs['<stepName>.isReady'].",
    },
  ],
  commonMistakes: [
    'Using `${{ variables.foo }}` in a condition for a variable that a script sets at runtime. Template expressions run before any script, so they only see values defined statically in YAML.',
    "Using `$(var)` as a key, in a `template:` path or inside a `condition:`. Macros only expand in task inputs and scripts; conditions need a runtime expression or bare `variables['name']`.",
    'Trying to pass a secret as a template parameter. Parameters are expanded into the final YAML, which anyone with read access can download. Keep secrets in variable groups or Key Vault.',
    'Referencing a template repository without a `ref`, so every consumer silently picks up whatever was merged to the default branch.',
    'Forgetting to authorise a new variable group or repository resource for the pipeline, then wondering why the first run waits on "This pipeline needs permission to access a resource".',
    'Expecting `$[ ]` to work inline inside a string. A runtime expression must be the entire right-hand side of a variable value or condition.',
  ],
  examTips: [
    'Memorise the three syntaxes and their timing: `${{ }}` compile time, `$[ ]` runtime (job or stage start), `$( )` macro (just before a task). Questions often show all three as options.',
    'If a question asks how to force every pipeline to include mandatory stages, the answer is an **extends** template plus the **Required template** check, not a step template.',
    'Task groups are classic-only. When the question says "YAML pipelines", the reusable equivalent is a step template.',
    'Variable groups linked to Key Vault need a service connection with Get and List secret permissions, and the group must be authorised for the pipeline.',
    'Parameters are typed and validated at compile time; variables are strings and mutable. "Restrict the user to dev, test or prod at queue time" means a runtime parameter with `values:`.',
    "Output variables need `isOutput=true` and a named step. A job condition in the same stage reads `dependencies.<job>.outputs['<step>.<var>']`, a job in a later stage reads `stageDependencies.<stage>.<job>.outputs[...]`, and a stage condition reads `dependencies.<stage>.outputs['<job>.<step>.<var>']`.",
  ],
  summary: [
    'Templates reuse steps, jobs, stages or variables; extends templates enforce structure.',
    'Parameters are typed and resolved at compile time; variables are strings resolved later.',
    '`${{ }}` is compile time, `$[ ]` is runtime, `$( )` is a macro expanded just before a task.',
    'Variable groups share values across pipelines and can pull secrets from Key Vault.',
    'Task groups are the classic-pipeline predecessor of step templates.',
    'Pin template repositories to tags and use the Required template check for governance.',
  ],
  practice: [
    {
      id: 'az4-pipeline-templates-p1',
      level: 'intermediate',
      prompt:
        'A script step sets a variable called deployNow to true. A later job uses condition: eq(${{ variables.deployNow }}, true) and never runs. Why, and what is the fix?',
      answer:
        "The template expression is evaluated at compile time, before the script ran, so it sees an empty value. Make the script emit an output variable and use a runtime condition such as eq(dependencies.Build.outputs['setFlag.deployNow'], 'true').",
      explanation:
        'Anything a script produces only exists at runtime, so only runtime expressions and conditions can see it.',
    },
    {
      id: 'az4-pipeline-templates-p2',
      level: 'advanced',
      prompt:
        'Your security team wants to guarantee that every pipeline deploying through the production service connection runs a mandatory scan stage. What combination of features achieves this?',
      answer:
        'Publish an extends template that contains the scan stage, have pipelines use extends: template: that file, and add a Required template check to the production service connection (and environment) that names that template.',
      explanation:
        'An include template can simply be left out by a pipeline author. The Required template check blocks any run that does not extend the approved template.',
    },
    {
      id: 'az4-pipeline-templates-p3',
      level: 'beginner',
      prompt:
        'A team is migrating a classic build that uses a task group with three tasks. What should the task group become in YAML?',
      answer:
        'A step template: a YAML file with a parameters block and a steps block, inserted with - template: path under steps.',
      explanation: 'YAML pipelines do not support task groups; templates replace them.',
    },
    {
      id: 'az4-pipeline-templates-p4',
      level: 'intermediate',
      prompt:
        'You want users who click Run pipeline to choose between the regions westeurope and northeurope and nothing else. How do you declare that?',
      answer:
        'Declare a root-level parameter of type string with a default and a values list containing westeurope and northeurope. Reference it as ${{ parameters.region }}.',
      explanation:
        'Runtime parameters appear as a form at queue time and reject any value not in the values list before the run starts.',
    },
  ],
  lab: {
    title: 'Build a template library and consume it',
    scenario:
      'Create a small template repository in Azure DevOps, then a service pipeline that consumes a step template with parameters, a variable group and a runtime parameter.',
    prerequisites: [
      'An Azure DevOps organisation and project (the free tier is fine)',
      'Azure CLI with the azure-devops extension (az extension add --name azure-devops)',
      'Git on your machine',
    ],
    tasks: [
      {
        instruction:
          'Create a repository called pipeline-templates and add templates/steps/hello.yml with a string parameter greeting (default Hello) and a single script step that echoes it.',
      },
      {
        instruction: 'Tag the commit v1 and push the tag.',
        hint: 'git tag v1 && git push origin v1',
      },
      {
        instruction:
          'Create a variable group called lab-settings with a variable colour=blue using the CLI.',
      },
      {
        instruction:
          'In a second repository, write azure-pipelines.yml that declares the template repository pinned to v1, uses the lab-settings group, and a runtime parameter environment with values dev and prod.',
      },
      {
        instruction:
          'Call the template with greeting set to "Hi from ${{ parameters.environment }}" and add a script that echoes $(colour).',
      },
      {
        instruction:
          'Create the pipeline, run it once with environment=prod from the CLI, and download the full YAML from the run.',
        hint: 'Check that the greeting contains prod and the colour line prints blue.',
      },
    ],
    solution: [
      {
        title: 'templates/steps/hello.yml',
        language: 'yaml',
        code: `parameters:
  - name: greeting
    type: string
    default: Hello

steps:
  - script: echo "\${{ parameters.greeting }}"
    displayName: Say greeting`,
      },
      {
        title: 'azure-pipelines.yml in the consumer repository',
        language: 'yaml',
        code: `parameters:
  - name: environment
    type: string
    default: dev
    values:
      - dev
      - prod

resources:
  repositories:
    - repository: templates
      type: git
      name: <project>/pipeline-templates
      ref: refs/tags/v1

trigger: none

pool:
  vmImage: ubuntu-latest

variables:
  - group: lab-settings

steps:
  - template: templates/steps/hello.yml@templates
    parameters:
      greeting: Hi from \${{ parameters.environment }}
  - script: echo "Colour is $(colour)"`,
      },
      {
        title: 'CLI commands',
        language: 'bash',
        code: `az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>
az pipelines variable-group create --name lab-settings --variables colour=blue --authorize true
az pipelines create --name templates-lab --repository consumer-app --repository-type tfsgit \\
  --branch main --yml-path azure-pipelines.yml --skip-first-run true
az pipelines run --name templates-lab --parameters environment=prod`,
      },
    ],
    verification: [
      {
        command: 'az pipelines runs list --pipeline-ids <pipelineId> --top 1 -o table',
        what: 'Shows the latest run and its result.',
        expected: 'Result succeeded.',
        placeholders: ['<pipelineId>'],
      },
      {
        command: 'Open the run log for the Say greeting step',
        what: 'Confirms the template parameter was expanded.',
        expected: 'Hi from prod',
      },
    ],
    cleanup: [
      {
        command: 'az pipelines delete --id <pipelineId> --yes',
        what: 'Deletes the lab pipeline.',
        placeholders: ['<pipelineId>'],
      },
      {
        command: 'az pipelines variable-group delete --id <groupId> --yes',
        what: 'Deletes the lab variable group.',
        placeholders: ['<groupId>'],
      },
    ],
  },
  relatedTopicIds: [
    'az4-yaml-pipelines',
    'az4-environments-approvals',
    'az4-pipeline-maintenance',
    'az4-pipeline-security',
  ],
  docs: [
    {
      title: 'Templates usage reference',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/templates',
    },
    {
      title: 'Template expressions',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/template-expressions',
    },
    {
      title: 'Define variables (expression syntaxes)',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/variables',
    },
    {
      title: 'Runtime parameters',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/process/runtime-parameters',
    },
    {
      title: 'Variable groups',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/library/variable-groups',
    },
    {
      title: 'Use templates for security',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/security/templates',
    },
  ],
}
