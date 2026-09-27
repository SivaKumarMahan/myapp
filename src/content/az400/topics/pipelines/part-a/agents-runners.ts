import type { Topic } from '../../../../types'

export const agentsRunners: Topic = {
  id: 'az4-agents-runners',
  title:
    'Agents and runners: hosted, self-hosted, scale sets, Managed DevOps Pools and parallel jobs',
  domainId: 'az4-pipelines',
  difficulty: 'intermediate',
  estimatedMinutes: 35,
  order: 4,
  tags: [
    'agents',
    'agent-pools',
    'self-hosted',
    'scale-set-agents',
    'managed-devops-pools',
    'github-runners',
    'parallel-jobs',
    'licensing',
  ],
  oneLiner:
    'Choose where pipeline jobs actually run - Microsoft- or GitHub-hosted machines, your own agents, autoscaling pools - and how many can run at once.',
  explanation: [
    'Every pipeline job needs a machine to run on. In Azure Pipelines that machine runs the **agent** software; in GitHub Actions it runs the **runner** application. Both connect **outbound** over HTTPS to the service, ask for work, run the job and report back - no inbound ports are needed.',
    '**Microsoft-hosted agents** (Azure Pipelines) and **GitHub-hosted runners** are virtual machines the vendor provisions for you with a large preinstalled toolset (`ubuntu-latest`, `windows-latest`, `macos-latest`). Each job gets a **fresh VM** that is discarded afterwards, so nothing leaks between jobs - but nothing is cached either, and they cannot reach your private network by default.',
    '**Self-hosted** agents or runners are machines you install the software on: a VM, a physical box, a container. You control the tools, the network location (reach a private database, an on-premises server) and the hardware. You also own patching, security and cleanup.',
    'Between those extremes are **autoscaling** options. **Azure Virtual Machine Scale Set agents** let Azure DevOps grow and shrink a VM scale set you own. **Managed DevOps Pools** is an Azure service (`Microsoft.DevOpsInfrastructure/pools`) where Microsoft runs the agents for you but in your subscription, with your choice of VM size, images, standby capacity and VNet. On GitHub, **larger runners** give more CPU/RAM, static IPs and Azure private networking, and **Actions Runner Controller** autoscales self-hosted runners on Kubernetes.',
    'Finally, capacity is licensed. In Azure DevOps you buy **parallel jobs**: the number of jobs that can run at the same time across the organization. In GitHub you pay for **minutes** on hosted runners beyond your plan allowance, while self-hosted runners use no GitHub minutes.',
  ],
  whyItMatters: [
    'AZ-400 asks you to design and implement agent infrastructure, including cost, tool selection, licenses, connectivity and maintainability. Typical questions: "the build must reach a database with no public endpoint", "builds queue for a long time", "we need a tool that is not on the hosted image", "minimize administrative effort".',
    'The choice has direct security implications. A self-hosted agent keeps state between jobs and runs whatever code the pipeline tells it to - including code from a pull request. That is why GitHub advises against self-hosted runners on public repositories.',
    'It is also the main lever on pipeline cost and speed: a warm self-hosted agent with caches can be much faster than a fresh hosted VM, but idle VMs cost money. Autoscaling pools exist to balance the two.',
  ],
  howItWorks: [
    'Azure DevOps agents live in **agent pools**, defined at organization level and made available to projects. The built-in **Azure Pipelines** pool is Microsoft-hosted; the **Default** pool is for your own agents. A YAML job selects a pool with `pool: vmImage:` (hosted) or `pool: name:` (self-hosted, scale set or Managed DevOps Pool).',
    'Each agent advertises **capabilities** (OS, installed tools, custom values). A job can add **demands** (`demands: - npm` or `- Agent.OS -equals Linux`) so it only runs on agents that satisfy them.',
    'You register a self-hosted agent by downloading it, running `config.sh` (Linux/macOS) or `config.cmd` (Windows) with the organization URL, an auth method and the pool name, then running it as a service (`svc.sh install`). The registering identity needs the Administrator role on the pool.',
    'For **scale set agents** you create a VM scale set (Uniform orchestration, manual upgrade policy, overprovisioning disabled) and point an agent pool at it. Azure DevOps installs the agent via an extension, adds instances when jobs queue, keeps a configured number on standby, and can reimage or delete each VM after every job.',
    '**Managed DevOps Pools** require a Dev Center and Dev Center project in Azure. You create the pool resource with a VM SKU, images (Microsoft-provided, Azure Compute Gallery or marketplace), maximum concurrency, stateless or stateful agents and optional VNet injection. Azure DevOps sees it as a pool you reference by name.',
    'In **GitHub Actions**, a job selects a runner with `runs-on`: a hosted label (`ubuntu-latest`), a set of self-hosted labels (`[self-hosted, linux, x64]`), or a runner group or larger-runner label. Organization **runner groups** control which repositories may use which self-hosted runners. `--ephemeral` registration makes a runner take exactly one job and then deregister.',
    '**Licensing**: Azure DevOps has a free tier of one Microsoft-hosted parallel job (with a monthly minutes limit for private projects, and a request form for new organizations) plus one self-hosted parallel job with unlimited minutes. Public projects get more free hosted parallelism. Extra parallel jobs are bought per month, self-hosted ones cheaper than hosted. Microsoft-hosted jobs have a maximum duration; self-hosted jobs can run much longer.',
  ],
  diagrams: [
    {
      kind: 'decision',
      title: 'Which kind of agent should run this job',
      caption:
        'Start with hosted and move only as far toward self-managed as the requirement forces you.',
      question: 'What does the job need that hosted agents cannot give?',
      branches: [
        {
          condition: 'nothing special, standard tools',
          result: 'Microsoft- or GitHub-hosted',
          detail: 'Least admin effort, fresh VM per job',
          tone: 'success',
        },
        {
          condition: 'private network access, managed for you',
          result: 'Managed DevOps Pools',
          detail: 'VNet injection, your SKU and images',
          tone: 'accent',
        },
        {
          condition: 'custom images and autoscale on your VMSS',
          result: 'Scale set agents',
          detail: 'Azure DevOps scales your scale set',
        },
        {
          condition: 'special hardware or on-premises',
          result: 'Self-hosted agent or runner',
          detail: 'You patch, secure and clean it',
          tone: 'warning',
        },
      ],
    },
    {
      kind: 'sequence',
      title: 'How an agent picks up a job',
      caption:
        'The agent polls outbound over HTTPS. The service never connects in, which is why agents work behind firewalls.',
      participants: [
        { id: 'svc', label: 'Azure Pipelines' },
        { id: 'agent', label: 'Agent' },
        { id: 'target', label: 'Private resource' },
      ],
      messages: [
        { from: 'agent', to: 'svc', label: 'Long-poll for a job (443 outbound)' },
        { from: 'svc', to: 'agent', label: 'Job plus short-lived job token', kind: 'return' },
        { from: 'agent', to: 'target', label: 'Run steps: build, test, deploy' },
        { from: 'target', to: 'agent', label: 'Results', kind: 'return' },
        { from: 'agent', to: 'svc', label: 'Stream logs and final status' },
      ],
    },
  ],
  keyObjects: [
    {
      kind: 'Agent pool (Azure DevOps)',
      purpose:
        'A named set of agents shared by projects. Pools are organization-level; projects reference them through queues.',
      fields: [
        {
          path: 'Azure Pipelines',
          meaning: 'Built-in Microsoft-hosted pool, selected with vmImage.',
        },
        { path: 'Default', meaning: 'Built-in pool for self-hosted agents.' },
        { path: 'Pool security roles', meaning: 'Reader, Service Account, Administrator.' },
        {
          path: 'Agent capabilities',
          meaning: 'System and user capabilities matched against job demands.',
        },
      ],
    },
    {
      kind: 'Managed DevOps Pool (Microsoft.DevOpsInfrastructure/pools)',
      apiVersion: '2024-10-19',
      purpose:
        'Azure-managed agent pool running in your subscription with your VM SKU, images, scaling and networking.',
      fields: [
        {
          path: 'properties.organizationProfile',
          meaning: 'Which Azure DevOps organization(s) and projects can use it.',
          required: true,
        },
        {
          path: 'properties.devCenterProjectResourceId',
          meaning: 'The Dev Center project the pool belongs to.',
          required: true,
        },
        {
          path: 'properties.maximumConcurrency',
          meaning: 'Maximum number of agents at once.',
          required: true,
        },
        {
          path: 'properties.agentProfile.kind',
          meaning: 'Stateless (fresh agent per job) or Stateful.',
        },
        { path: 'properties.fabricProfile.sku.name', meaning: 'VM size for the agents.' },
        {
          path: 'properties.fabricProfile.images[]',
          meaning: 'Well-known, Azure Compute Gallery or marketplace images.',
        },
        {
          path: 'properties.fabricProfile.networkProfile.subnetId',
          meaning: 'Optional subnet for private network access.',
        },
      ],
    },
    {
      kind: 'Scale set agent pool',
      purpose: 'An Azure DevOps pool backed by a VM scale set you own, scaled by Azure DevOps.',
      fields: [
        { path: 'Maximum number of VMs', meaning: 'Upper bound on scale-out.' },
        {
          path: 'Number of agents to keep on standby',
          meaning: 'Warm capacity to reduce queue time.',
        },
        {
          path: 'Delay before deleting excess idle agents',
          meaning: 'Idle timeout before scale-in.',
        },
        {
          path: 'Automatically tear down VMs after every use',
          meaning: 'Fresh VM per job, like hosted agents.',
        },
      ],
    },
    {
      kind: 'GitHub Actions runner',
      purpose: 'The machine that executes a workflow job.',
      fields: [
        {
          path: 'runs-on',
          meaning: 'Hosted label, self-hosted labels, or group/labels object.',
          required: true,
        },
        {
          path: 'Runner group',
          meaning: 'Org/enterprise grouping that limits which repos can use runners.',
        },
        {
          path: '--ephemeral',
          meaning: 'Runner takes one job and deregisters - recommended for autoscaling.',
        },
        {
          path: 'Larger runners',
          meaning: 'Hosted runners with more resources, static IP and private networking options.',
        },
      ],
    },
  ],
  realWorldExample: {
    title: 'Queues, a private database and a surprising bill',
    story: [
      'An insurance company had forty developers on the free Azure DevOps tier with one Microsoft-hosted parallel job. Builds queued for twenty minutes at lunchtime, and integration tests could not reach the SQL database, which only had a private endpoint.',
      'Their first fix was a single self-hosted VM in the VNet. Queues shrank, but the VM accumulated old node_modules, a stale tool version broke a build, and one PR pipeline wrote a file that the next pipeline picked up.',
      'They replaced it with a Managed DevOps Pool: Stateless agents, the Microsoft Ubuntu image, a small standby count during working hours, and VNet injection into the integration subnet. Each job got a clean agent that could reach the database, and they bought additional self-hosted parallel jobs rather than hosted ones.',
      'Their GitHub-hosted open-source SDKs stayed on GitHub-hosted runners: public repos get free minutes, and running untrusted fork PRs on internal machines was never an option.',
    ],
  },
  yamlExamples: [
    {
      title: 'Selecting agents in Azure Pipelines',
      language: 'yaml',
      explanation:
        'Hosted jobs use vmImage; self-hosted, scale set and Managed DevOps Pools use the pool name, optionally with demands.',
      code: `jobs:
  - job: HostedLinux
    pool:
      vmImage: ubuntu-latest
    steps:
      - script: uname -a

  - job: PrivateIntegrationTests
    pool:
      name: mdp-contoso-integration
    timeoutInMinutes: 120
    steps:
      - script: ./run-integration-tests.sh

  - job: GpuTraining
    pool:
      name: Default
      demands:
        - Agent.OS -equals Linux
        - cuda
    steps:
      - script: nvidia-smi`,
    },
    {
      title: 'Selecting runners in GitHub Actions',
      language: 'yaml',
      explanation:
        'A self-hosted job must match all listed labels. The group form targets an organization runner group, useful for larger runners.',
      code: `name: build
on: [push]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make test

  integration:
    runs-on: [self-hosted, linux, x64, vnet]
    steps:
      - uses: actions/checkout@v4
      - run: make integration

  heavy-build:
    runs-on:
      group: large-runners
      labels: ubuntu-22.04-16core
    steps:
      - uses: actions/checkout@v4
      - run: make release`,
    },
  ],
  imperative: [
    {
      command:
        './config.sh --unattended --url https://dev.azure.com/<org> --auth pat --token <pat> --pool Default --agent build-01 --acceptTeeEula && sudo ./svc.sh install && sudo ./svc.sh start',
      what: 'Registers a Linux self-hosted Azure Pipelines agent in the Default pool and runs it as a systemd service.',
      expected: 'Successfully added the agent, then the service reports active (running).',
      placeholders: ['<org>', '<pat>'],
      namespaceNote:
        'The PAT only needs Agent Pools (read, manage) and is used once for registration; the agent then uses its own credentials.',
    },
    {
      command:
        'az vmss create -n vmss-agents -g <rg> --image Ubuntu2204 --vm-sku Standard_D2s_v5 --instance-count 2 --orchestration-mode Uniform --upgrade-policy-mode manual --disable-overprovision --single-placement-group false --platform-fault-domain-count 1 --load-balancer "" --authentication-type SSH --generate-ssh-keys',
      what: 'Creates a VM scale set in the shape Azure DevOps scale set agent pools require.',
      expected:
        'JSON for the new scale set; then create the pool in Organization settings > Agent pools > Azure virtual machine scale set.',
      placeholders: ['<rg>'],
    },
    {
      command:
        './config.sh --url https://github.com/<owner>/<repo> --token <registration-token> --labels linux,x64,vnet --ephemeral --unattended',
      what: 'Registers a GitHub self-hosted runner that takes a single job and then removes itself.',
      expected: 'Runner successfully added, then Listening for Jobs after ./run.sh.',
      placeholders: ['<owner>', '<repo>', '<registration-token>'],
    },
    {
      command: 'gh api -X POST repos/<owner>/<repo>/actions/runners/registration-token --jq .token',
      what: 'Gets a short-lived registration token for a repository runner (valid for about an hour).',
      placeholders: ['<owner>', '<repo>'],
    },
  ],
  declarative: {
    steps: [
      'Create a Dev Center and a Dev Center project (a Managed DevOps Pool must belong to one).',
      'Register the Microsoft.DevOpsInfrastructure resource provider in the subscription.',
      'Deploy the pool with Bicep: organization URL, max concurrency, Stateless agents, SKU, image and optional subnet.',
      'The pool appears in Azure DevOps; reference it from YAML with pool: name.',
      'Grant pipelines permission to use the pool in its security settings, or approve on first use.',
    ],
    code: [
      {
        title: 'Managed DevOps Pool (Bicep)',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param devCenterProjectId string
param subnetId string

resource pool 'Microsoft.DevOpsInfrastructure/pools@2024-10-19' = {
  name: 'mdp-contoso-integration'
  location: location
  properties: {
    organizationProfile: {
      kind: 'AzureDevOps'
      organizations: [
        {
          url: 'https://dev.azure.com/contoso'
          parallelism: 4
        }
      ]
    }
    devCenterProjectResourceId: devCenterProjectId
    maximumConcurrency: 4
    agentProfile: {
      kind: 'Stateless'
    }
    fabricProfile: {
      kind: 'Vmss'
      sku: {
        name: 'Standard_D2ads_v5'
      }
      images: [
        {
          wellKnownImageName: 'ubuntu-22.04/latest'
        }
      ]
      networkProfile: {
        subnetId: subnetId
      }
    }
  }
}`,
      },
    ],
  },
  verification: [
    {
      command: 'az pipelines pool list --query "[].{name:name, id:id, hosted:isHosted}" -o table',
      what: 'Lists agent pools in the organization and whether each is hosted.',
      expected: 'Azure Pipelines (hosted True), Default, and your own pools.',
    },
    {
      command:
        'az pipelines agent list --pool-id <pool-id> --query "[].{name:name, status:status, enabled:enabled}" -o table',
      what: 'Shows each agent and whether it is online.',
      expected: 'build-01  online  True',
      placeholders: ['<pool-id>'],
    },
    {
      command:
        'gh api repos/<owner>/<repo>/actions/runners --jq ".runners[] | {name, status, labels: [.labels[].name]}"',
      what: 'Lists GitHub self-hosted runners with status and labels.',
      placeholders: ['<owner>', '<repo>'],
    },
  ],
  troubleshooting: [
    {
      command:
        'az pipelines agent show --pool-id <pool-id> --agent-id <agent-id> --include-capabilities',
      what: 'A job stuck with "No agent found in pool which satisfies the specified demands" - compare the job demands with the agent capabilities shown here.',
      placeholders: ['<pool-id>', '<agent-id>'],
    },
    {
      command: 'sudo ./svc.sh status && tail -n 50 _diag/Agent_*.log',
      what: 'An offline self-hosted agent: check the service and the diagnostic log for proxy, TLS or authentication errors.',
      expected: 'active (running) and log lines showing a successful connection.',
    },
    {
      command: 'az resource list --resource-type Microsoft.DevOpsInfrastructure/pools -o table',
      what: 'If a Managed DevOps Pool is missing in Azure DevOps, confirm the resource exists and provisioned in the expected subscription.',
    },
  ],
  commonMistakes: [
    'Using a self-hosted agent that keeps state between jobs without cleaning the workspace, so one build picks up another build’s files.',
    'Registering self-hosted GitHub runners on a public repository, where anyone can open a PR that runs code on your machine.',
    'Buying more agents instead of more parallel jobs. Azure DevOps runs at most as many concurrent jobs as you have parallel jobs, however many agents are online.',
    'Expecting Microsoft-hosted agents to reach a private endpoint. They run outside your network; use self-hosted, scale set agents or Managed DevOps Pools with VNet injection.',
    'Assuming Microsoft-hosted jobs can run for hours. They have a maximum job duration; long jobs need self-hosted capacity.',
    'Using a long-lived PAT for ongoing agent authentication. The PAT is only for registration.',
  ],
  examTips: [
    '"Least administrative effort" and no special requirements points to **Microsoft-hosted** agents or **GitHub-hosted** runners.',
    '"Private network access with Microsoft managing the agents" points to **Managed DevOps Pools**.',
    '"Autoscale our own VM image in Azure" points to **scale set agents** (or Managed DevOps Pools with a gallery image).',
    'Concurrency in Azure DevOps is limited by **parallel jobs**, bought separately for Microsoft-hosted and self-hosted.',
    'Self-hosted agents communicate **outbound on 443**; no inbound firewall rules are needed.',
    'Job **demands** must match agent **capabilities**; `runs-on` labels must all match the runner.',
  ],
  summary: [
    'Agents (Azure Pipelines) and runners (GitHub) are the machines that run jobs; they poll outbound for work.',
    'Hosted means fresh VMs with minimal admin; self-hosted means control over tools, network and hardware, plus maintenance.',
    'Scale set agents autoscale your VMSS; Managed DevOps Pools are Azure-managed pools with VNet injection.',
    'GitHub adds larger runners, runner groups, ephemeral runners and Actions Runner Controller.',
    'Azure DevOps concurrency is licensed as parallel jobs; GitHub bills hosted minutes beyond the plan allowance.',
  ],
  practice: [
    {
      id: 'az4-agents-runners-p1',
      level: 'beginner',
      prompt:
        'Integration tests must reach an Azure SQL database that only has a private endpoint. Why do they fail on ubuntu-latest, and name two options that fix it?',
      answer:
        'Microsoft-hosted agents run outside your virtual network, so they cannot resolve or reach the private endpoint. Use a Managed DevOps Pool with VNet injection, scale set agents in the VNet, or a self-hosted agent in the VNet.',
    },
    {
      id: 'az4-agents-runners-p2',
      level: 'intermediate',
      prompt:
        'You registered five self-hosted agents but still only one job runs at a time. What is limiting you?',
      answer:
        'The number of self-hosted parallel jobs purchased for the organization. Concurrency is capped by parallel jobs, not by agents online; buy more self-hosted parallel jobs.',
    },
    {
      id: 'az4-agents-runners-p3',
      level: 'intermediate',
      prompt:
        'A job fails to start with "No agent found in pool Default which satisfies the specified demands: java". What do you check?',
      answer:
        'Whether any agent in the pool has a java capability. Install the tool (the agent detects it after restart) or add a user capability, or remove the demand if it is not needed.',
    },
    {
      id: 'az4-agents-runners-p4',
      level: 'advanced',
      prompt:
        'Why do autoscaled self-hosted runners typically use the --ephemeral option, and what risk does it mitigate?',
      answer:
        'An ephemeral runner takes exactly one job and then deregisters, so each job starts on a clean machine. It prevents one job from leaving files, credentials or modified tools behind for the next job, and fits autoscalers that create a runner per job.',
    },
  ],
  lab: {
    title: 'Run a job on your own agent and compare it with a hosted one',
    scenario:
      'Register a Linux VM as a self-hosted agent in a new pool, route one job to it with a demand, and compare it with a Microsoft-hosted job.',
    prerequisites: [
      'Azure subscription and Azure CLI',
      'Azure DevOps organization and project with a repo',
      'A PAT with Agent Pools (read, manage) scope, used only for registration',
    ],
    tasks: [
      {
        instruction:
          'In Organization settings > Agent pools, create a self-hosted pool named lab-pool and grant your project access.',
      },
      {
        instruction: 'Create a resource group and a small Ubuntu VM.',
      },
      {
        instruction:
          'SSH to the VM, download the latest agent, and register it in lab-pool as a service.',
        hint: 'Use the Download agent button in the pool to get the current URL.',
      },
      {
        instruction: 'Add a user capability named lab=true to the agent in the portal.',
      },
      {
        instruction:
          'Write a pipeline with one job on ubuntu-latest and one on lab-pool with the demand lab -equals true; each prints hostname.',
      },
      {
        instruction:
          'Run it twice. Note that the hosted hostname changes and the self-hosted one does not, and check whether files from the first run remain in the self-hosted work folder.',
      },
    ],
    solution: [
      {
        title: 'VM and agent',
        language: 'bash',
        code: `az group create -n rg-az400-agents -l westeurope
az vm create -g rg-az400-agents -n vm-agent01 --image Ubuntu2204 \\
  --size Standard_B2s --admin-username azureuser --generate-ssh-keys \\
  --public-ip-sku Standard

ssh azureuser@<vm-public-ip>
mkdir myagent && cd myagent
curl -sSL -o agent.tar.gz <agent-download-url>
tar zxf agent.tar.gz
./config.sh --unattended --url https://dev.azure.com/<org> --auth pat \\
  --token <pat> --pool lab-pool --agent vm-agent01 --acceptTeeEula
sudo ./svc.sh install && sudo ./svc.sh start`,
      },
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `trigger: none

jobs:
  - job: Hosted
    pool:
      vmImage: ubuntu-latest
    steps:
      - script: hostname && ls $(Agent.BuildDirectory)

  - job: SelfHosted
    pool:
      name: lab-pool
      demands:
        - lab -equals true
    steps:
      - script: |
          hostname
          date >> $(Agent.BuildDirectory)/runs.txt
          cat $(Agent.BuildDirectory)/runs.txt`,
      },
    ],
    verification: [
      {
        command: 'az pipelines agent list --pool-id <lab-pool-id> -o table',
        what: 'Shows vm-agent01 online in lab-pool.',
        expected: 'status online, enabled True.',
        placeholders: ['<lab-pool-id>'],
      },
      {
        command: 'az pipelines runs list --top 2 -o table',
        what: 'Both runs succeeded; the self-hosted job log shows runs.txt growing across runs.',
      },
    ],
    cleanup: [
      {
        command:
          'sudo ./svc.sh stop && sudo ./svc.sh uninstall && ./config.sh remove --unattended --auth pat --token <pat>',
        what: 'Run on the VM to deregister the agent from the pool.',
        placeholders: ['<pat>'],
      },
      {
        command: 'az group delete -n rg-az400-agents --yes --no-wait',
        what: 'Deletes the VM and everything in the lab resource group. Delete lab-pool in Organization settings, and revoke the PAT.',
      },
    ],
  },
  relatedTopicIds: [
    'az4-yaml-pipelines',
    'az4-github-actions',
    'az4-pipeline-maintenance',
    'az4-pipeline-security',
  ],
  docs: [
    {
      title: 'Azure Pipelines agents',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/agents/agents',
    },
    {
      title: 'Azure Virtual Machine Scale Set agents',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/agents/scale-set-agents',
    },
    {
      title: 'What is Managed DevOps Pools?',
      url: 'https://learn.microsoft.com/azure/devops/managed-devops-pools/overview',
    },
    {
      title: 'Configure and pay for parallel jobs',
      url: 'https://learn.microsoft.com/azure/devops/pipelines/licensing/concurrent-jobs',
    },
    {
      title: 'About self-hosted runners',
      url: 'https://docs.github.com/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners',
    },
  ],
}
