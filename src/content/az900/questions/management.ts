import type { Question } from '../../types'

/** Original practice questions for this domain. Written for this app. */
export const az900ManagementQuestions: Question[] = [
  {
    id: 'az9q-mgt-1',
    domainId: 'az9-management',
    topicId: 'az9-cost-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You need to estimate the monthly cost of a new Azure solution before deploying it. Which tool should you use?',
    options: [
      { id: 'a', text: 'Azure Pricing calculator' },
      { id: 'b', text: 'Total Cost of Ownership (TCO) calculator' },
      { id: 'c', text: 'Microsoft Cost Management cost analysis' },
      { id: 'd', text: 'Azure Advisor' },
    ],
    correct: ['a'],
    explanation:
      'The Pricing calculator estimates the cost of Azure services you plan to use. The TCO calculator compares on-premises with Azure, cost analysis reports on spending that already happened, and Advisor recommends optimisations for existing resources.',
  },
  {
    id: 'az9q-mgt-2',
    domainId: 'az9-management',
    topicId: 'az9-cost-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Management wants to compare the five-year cost of the current on-premises datacenter with running the same workloads in Azure. Which tool fits?',
    options: [
      { id: 'a', text: 'Azure Pricing calculator' },
      { id: 'b', text: 'TCO calculator' },
      { id: 'c', text: 'Azure Service Health' },
      { id: 'd', text: 'Azure Migrate dependency analysis' },
    ],
    correct: ['b'],
    explanation:
      'The TCO calculator models on-premises costs (hardware, power, labour) against Azure over several years. The Pricing calculator only prices Azure services, Service Health reports on platform incidents, and dependency analysis maps server connections rather than costs.',
  },
  {
    id: 'az9q-mgt-3',
    domainId: 'az9-management',
    topicId: 'az9-cost-management',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which factors can change the cost of running the same Azure resource? (Select all that apply.)',
    options: [
      { id: 'a', text: 'The Azure region it runs in' },
      { id: 'b', text: 'Outbound data transfer from Azure' },
      { id: 'c', text: 'The SKU or tier selected' },
      { id: 'd', text: 'The number of tags applied to it' },
      { id: 'e', text: 'Which web browser you use to open the portal' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Region, egress traffic and resource type or SKU all affect price. Tags are free metadata used to organise costs, and the browser you use has no effect on billing.',
  },
  {
    id: 'az9q-mgt-4',
    domainId: 'az9-management',
    topicId: 'az9-cost-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'A monthly budget in Cost Management reaches 100% of its amount. What happens by default?',
    options: [
      { id: 'a', text: 'All resources in the scope are stopped' },
      { id: 'b', text: 'New deployments are blocked until next month' },
      { id: 'c', text: 'Configured recipients are notified; resources keep running' },
      { id: 'd', text: 'The subscription is converted to a spending-limit offer' },
    ],
    correct: ['c'],
    explanation:
      'Budgets send alerts when thresholds are reached. They do not stop or block anything unless you connect an action group to automation yourself. Spending limits are a feature of certain offers such as free accounts, not something a budget creates.',
  },
  {
    id: 'az9q-mgt-5',
    domainId: 'az9-management',
    topicId: 'az9-cost-management',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Finance wants to see Azure costs broken down by department across many resource groups. What should you apply to resources?',
    options: [
      { id: 'a', text: 'Resource locks' },
      { id: 'b', text: 'Tags such as Department or CostCenter' },
      { id: 'c', text: 'Separate Microsoft Entra tenants per department' },
      { id: 'd', text: 'Availability zones' },
    ],
    correct: ['b'],
    explanation:
      'Tags are name/value metadata that Cost Management can group and filter by. Locks prevent deletion, separate tenants are an extreme and unnecessary split for reporting, and zones are about availability.',
  },
  {
    id: 'az9q-mgt-6',
    domainId: 'az9-management',
    topicId: 'az9-cost-management',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write the Azure CLI command that lists every resource in the current subscription that has the tag `CostCenter` with the value `1234`.',
    acceptedAnswers: [
      'az resource list --tag CostCenter=1234',
      'az resource list --tag CostCenter=1234 -o table',
      'az resource list --tag CostCenter=1234 --output table',
    ],
    answerHint: 'az resource list ...',
    explanation:
      '`az resource list --tag name=value` filters resources by tag. `az tag list` lists tag names used in the subscription rather than the resources carrying them.',
  },
  {
    id: 'az9q-mgt-7',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'You must prevent anyone from creating resources outside the West Europe region. What should you use?',
    options: [
      { id: 'a', text: 'Azure Policy' },
      { id: 'b', text: 'A ReadOnly resource lock' },
      { id: 'c', text: 'Azure Advisor' },
      { id: 'd', text: 'Tags' },
    ],
    correct: ['a'],
    explanation:
      'Azure Policy with the Allowed locations definition denies deployments to other regions. A ReadOnly lock blocks all changes rather than filtering by region, Advisor only recommends, and tags are metadata that enforce nothing.',
  },
  {
    id: 'az9q-mgt-8',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A resource group has a CanNotDelete lock. What can a user with the Owner role do to resources in it?',
    options: [
      { id: 'a', text: 'Read and modify them, but not delete them' },
      { id: 'b', text: 'Only read them' },
      { id: 'c', text: 'Delete them, because Owners bypass locks' },
      { id: 'd', text: 'Nothing at all until the lock expires' },
    ],
    correct: ['a'],
    explanation:
      'CanNotDelete (Delete in the portal) allows reading and modifying but blocks deletion. ReadOnly is the lock that allows only reading. Locks apply to Owners too, and they do not expire - they must be removed.',
  },
  {
    id: 'az9q-mgt-9',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'What is an Azure Policy initiative?',
    options: [
      { id: 'a', text: 'A single rule with a condition and an effect' },
      { id: 'b', text: 'A group of policy definitions managed and assigned together' },
      { id: 'c', text: 'A role that grants permission to create policies' },
      { id: 'd', text: 'A report of non-compliant resources' },
    ],
    correct: ['b'],
    explanation:
      'An initiative (policy set definition) bundles several definitions toward one goal, such as a regulatory standard. A single rule is a policy definition, permissions come from RBAC roles, and the compliance view is a report rather than an initiative.',
  },
  {
    id: 'az9q-mgt-10',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Where can you download Microsoft independent audit reports, such as SOC and ISO reports, for Azure?',
    options: [
      { id: 'a', text: 'Azure Policy compliance dashboard' },
      { id: 'b', text: 'Microsoft Service Trust Portal' },
      { id: 'c', text: 'Azure Service Health' },
      { id: 'd', text: 'Microsoft Defender for Cloud secure score' },
    ],
    correct: ['b'],
    explanation:
      'The Service Trust Portal publishes Microsoft audit reports, certifications and compliance guides. Policy compliance reports on your resources, Service Health reports platform incidents, and secure score measures your own security posture.',
  },
  {
    id: 'az9q-mgt-11',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Your organisation wants to discover, classify and map sensitive data across Azure, on-premises and SaaS sources. Which solution fits?',
    options: [
      { id: 'a', text: 'Microsoft Purview' },
      { id: 'b', text: 'Azure Policy' },
      { id: 'c', text: 'Azure Arc' },
      { id: 'd', text: 'Azure Monitor' },
    ],
    correct: ['a'],
    explanation:
      'Microsoft Purview provides data governance: scanning sources, building a data map and classifying data. Azure Policy governs resource configuration, Arc extends management to non-Azure machines, and Azure Monitor collects telemetry.',
  },
  {
    id: 'az9q-mgt-12',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt: 'Which statements about Azure Policy are true? (Select all that apply.)',
    options: [
      {
        id: 'a',
        text: 'Assignments at a management group are inherited by subscriptions beneath it',
      },
      { id: 'b', text: 'A Deny effect blocks non-compliant requests even from Owners' },
      {
        id: 'c',
        text: 'Policy can remediate some existing resources using Modify or DeployIfNotExists',
      },
      { id: 'd', text: 'Policy decides which users are allowed to sign in to Azure' },
      {
        id: 'e',
        text: 'A new Deny assignment automatically deletes existing non-compliant resources',
      },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Policy inherits down the hierarchy, applies regardless of role, and can remediate with Modify or DeployIfNotExists. Sign-in is controlled by Microsoft Entra ID and Conditional Access, not Policy, and existing non-compliant resources are flagged rather than deleted.',
  },
  {
    id: 'az9q-mgt-13',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'command',
    category: 'command',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Write the Azure CLI command that adds a lock named `protect` of type CanNotDelete to the resource group `rg-prod`.',
    acceptedAnswers: [
      'az lock create --name protect --resource-group rg-prod --lock-type CanNotDelete',
      'az lock create -n protect -g rg-prod --lock-type CanNotDelete',
      'az lock create --name protect -g rg-prod --lock-type CanNotDelete',
      'az lock create -n protect --resource-group rg-prod --lock-type CanNotDelete',
      'az lock create --lock-type CanNotDelete --name protect --resource-group rg-prod',
      'az lock create --lock-type CanNotDelete -n protect -g rg-prod',
    ],
    answerHint: 'az lock create ...',
    explanation:
      '`az lock create` with `--lock-type CanNotDelete` and a resource group creates the lock at group scope. Use `ReadOnly` instead to block modifications as well.',
  },
  {
    id: 'az9q-mgt-14',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'command',
    category: 'command',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Write the Azure CLI command that lists the policy assignments that apply to the resource group `rg-prod`.',
    acceptedAnswers: [
      'az policy assignment list --resource-group rg-prod',
      'az policy assignment list -g rg-prod',
      'az policy assignment list -g rg-prod -o table',
      'az policy assignment list --resource-group rg-prod --output table',
      'az policy assignment list --resource-group rg-prod -o table',
    ],
    answerHint: 'az policy assignment ...',
    explanation:
      '`az policy assignment list` scoped with `--resource-group` returns assignments at that group. Add `--disable-scope-strict-match` to include those inherited from the subscription and management groups.',
  },
  {
    id: 'az9q-mgt-15',
    domainId: 'az9-management',
    topicId: 'az9-governance-compliance',
    kind: 'task',
    category: 'lab',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Protect a shared resource group: create `rg-shared` in West Europe tagged Environment=prod, add a delete lock, and assign the built-in Allowed locations policy so only West Europe is permitted.',
    context: 'Cloud Shell (Bash) in a subscription where you are Owner.',
    checkpoints: [
      { id: 'c1', text: 'az group show -n rg-shared --query tags shows Environment set to prod' },
      { id: 'c2', text: 'az lock list -g rg-shared shows a CanNotDelete lock' },
      {
        id: 'c3',
        text: 'Creating a storage account in eastus in rg-shared fails with RequestDisallowedByPolicy',
      },
      { id: 'c4', text: 'az group delete -n rg-shared fails with a ScopeLocked error' },
    ],
    solution: [
      {
        title: 'CLI solution',
        language: 'bash',
        code: `SUB=$(az account show --query id -o tsv)
az group create -n rg-shared -l westeurope --tags Environment=prod
az lock create -n protect -g rg-shared --lock-type CanNotDelete
az policy assignment create --name allowed-locations \\
  --scope /subscriptions/$SUB/resourceGroups/rg-shared \\
  --policy e56962a6-4747-49cd-b67b-bf8b01975c4c \\
  --params '{"listOfAllowedLocations":{"value":["westeurope"]}}'

# Cleanup afterwards
az lock delete -n protect -g rg-shared
az policy assignment delete --name allowed-locations --scope /subscriptions/$SUB/resourceGroups/rg-shared
az group delete -n rg-shared --yes --no-wait`,
      },
    ],
    explanation:
      'Tags organise, locks prevent accidental deletion, and Policy enforces allowed regions - three separate governance tools that complement each other. The lock must be removed before the group can be deleted.',
  },
  {
    id: 'az9q-mgt-16',
    domainId: 'az9-management',
    topicId: 'az9-deployment-tools',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'A user needs to run Azure CLI and Azure PowerShell commands from a browser without installing anything. What should they use?',
    options: [
      { id: 'a', text: 'Azure Cloud Shell' },
      { id: 'b', text: 'Azure Arc' },
      { id: 'c', text: 'Azure Bastion' },
      { id: 'd', text: 'The Azure mobile app only' },
    ],
    correct: ['a'],
    explanation:
      'Cloud Shell is a browser-based shell with Bash or PowerShell, pre-authenticated and with the tools installed. Arc manages non-Azure resources, Bastion gives browser RDP/SSH to VMs, and the mobile app offers limited management, not a full scripting shell.',
  },
  {
    id: 'az9q-mgt-17',
    domainId: 'az9-management',
    topicId: 'az9-deployment-tools',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt: 'Which statement about ARM templates and Bicep is correct?',
    options: [
      { id: 'a', text: 'They are imperative scripts that run commands in order' },
      {
        id: 'b',
        text: 'They are declarative: you describe the desired resources and Resource Manager deploys them',
      },
      { id: 'c', text: 'Bicep deploys through a different engine from ARM templates' },
      { id: 'd', text: 'They can only be deployed from the Azure portal' },
    ],
    correct: ['b'],
    explanation:
      'ARM JSON and Bicep are declarative infrastructure as code. Bicep compiles to ARM JSON and uses the same Resource Manager engine, and both can be deployed from the CLI, PowerShell, pipelines or the portal.',
  },
  {
    id: 'az9q-mgt-18',
    domainId: 'az9-management',
    topicId: 'az9-deployment-tools',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You want to apply Azure Policy and tags to Windows servers that run in your own datacenter. Which service enables this?',
    options: [
      { id: 'a', text: 'Azure Migrate' },
      { id: 'b', text: 'Azure Arc' },
      { id: 'c', text: 'Azure Site Recovery' },
      { id: 'd', text: 'Azure Virtual Desktop' },
    ],
    correct: ['b'],
    explanation:
      'Azure Arc projects non-Azure servers into Resource Manager so Policy, tags, RBAC and monitoring apply. Migrate moves servers into Azure, Site Recovery replicates for DR, and Virtual Desktop delivers desktops.',
  },
  {
    id: 'az9q-mgt-19',
    domainId: 'az9-management',
    topicId: 'az9-deployment-tools',
    kind: 'multi',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which tools send their requests through Azure Resource Manager? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Azure portal' },
      { id: 'b', text: 'Azure CLI' },
      { id: 'c', text: 'Azure PowerShell' },
      { id: 'd', text: 'Bicep deployments' },
      { id: 'e', text: 'None of them - each tool has its own API' },
    ],
    correct: ['a', 'b', 'c', 'd'],
    explanation:
      'Every management tool - portal, CLI, PowerShell, templates, SDKs and REST - goes through Azure Resource Manager, which is why RBAC, Policy and locks apply consistently. There is no separate API per tool.',
  },
  {
    id: 'az9q-mgt-20',
    domainId: 'az9-management',
    topicId: 'az9-deployment-tools',
    kind: 'command',
    category: 'command',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Write the Azure CLI command that previews, without deploying, the changes `main.bicep` would make to resource group `rg-app`.',
    acceptedAnswers: [
      'az deployment group what-if --resource-group rg-app --template-file main.bicep',
      'az deployment group what-if -g rg-app --template-file main.bicep',
      'az deployment group what-if -g rg-app -f main.bicep',
      'az deployment group what-if --resource-group rg-app -f main.bicep',
      'az deployment group what-if --template-file main.bicep --resource-group rg-app',
      'az deployment group what-if --template-file main.bicep -g rg-app',
    ],
    answerHint: 'az deployment group ...',
    explanation:
      '`az deployment group what-if` compiles the template and reports resources to create, modify or delete without changing anything. `az deployment group create` would actually deploy.',
  },
  {
    id: 'az9q-mgt-21',
    domainId: 'az9-management',
    topicId: 'az9-monitoring-tools',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'beginner',
    points: 1,
    prompt:
      'Which service provides free, personalised recommendations to reduce cost and improve security, reliability and performance?',
    options: [
      { id: 'a', text: 'Azure Advisor' },
      { id: 'b', text: 'Azure Service Health' },
      { id: 'c', text: 'Application Insights' },
      { id: 'd', text: 'Azure Policy' },
    ],
    correct: ['a'],
    explanation:
      'Azure Advisor analyses configuration and usage and recommends improvements in five categories. Service Health reports on Azure platform events, Application Insights monitors apps, and Policy enforces rules rather than recommending.',
  },
  {
    id: 'az9q-mgt-22',
    domainId: 'az9-management',
    topicId: 'az9-monitoring-tools',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'You want to be notified when Microsoft performs planned maintenance or has an incident affecting the services and regions you use. What should you configure?',
    options: [
      { id: 'a', text: 'An Azure Advisor digest' },
      { id: 'b', text: 'A Service Health alert' },
      { id: 'c', text: 'A metric alert on CPU' },
      { id: 'd', text: 'An Application Insights availability test' },
    ],
    correct: ['b'],
    explanation:
      'Service Health alerts notify you about incidents, planned maintenance and advisories for your services and regions. Advisor digests summarise recommendations, CPU alerts watch your own resources, and availability tests probe your own endpoints.',
  },
  {
    id: 'az9q-mgt-23',
    domainId: 'az9-management',
    topicId: 'az9-monitoring-tools',
    kind: 'mcq',
    category: 'concept',
    difficulty: 'intermediate',
    points: 2,
    prompt:
      'Which feature of Azure Monitor tracks web application request rates, response times, failures and dependencies?',
    options: [
      { id: 'a', text: 'Resource Health' },
      { id: 'b', text: 'Application Insights' },
      { id: 'c', text: 'Activity log' },
      { id: 'd', text: 'Azure Advisor' },
    ],
    correct: ['b'],
    explanation:
      'Application Insights is the application performance monitoring feature of Azure Monitor. Resource Health shows whether a resource is available, the activity log records control-plane operations, and Advisor gives recommendations.',
  },
  {
    id: 'az9q-mgt-24',
    domainId: 'az9-management',
    topicId: 'az9-monitoring-tools',
    kind: 'multi',
    category: 'concept',
    difficulty: 'advanced',
    points: 2,
    prompt: 'Which statements about Azure Monitor are true? (Select all that apply.)',
    options: [
      { id: 'a', text: 'Logs are stored in a Log Analytics workspace and queried with KQL' },
      { id: 'b', text: 'Alert rules can notify people through action groups' },
      { id: 'c', text: 'It can collect data from on-premises machines as well as Azure' },
      { id: 'd', text: 'It publishes Microsoft SOC 2 audit reports' },
      { id: 'e', text: 'Resource logs are always collected without any configuration' },
    ],
    correct: ['a', 'b', 'c'],
    explanation:
      'Azure Monitor stores logs in Log Analytics, alerts through action groups, and collects from Azure, on-premises (via the Azure Monitor Agent and Arc) and apps. Audit reports come from the Service Trust Portal, and resource logs need a diagnostic setting.',
  },
  {
    id: 'az9q-mgt-25',
    domainId: 'az9-management',
    topicId: 'az9-monitoring-tools',
    kind: 'mcq',
    category: 'troubleshoot',
    difficulty: 'advanced',
    points: 2,
    prompt:
      'Your web app is failing. Application Insights shows timeouts to its database, and Service Health shows an active incident for that database service in your region. What is the most appropriate first conclusion?',
    options: [
      { id: 'a', text: 'Your application code has a bug and should be rolled back immediately' },
      {
        id: 'b',
        text: 'The issue is likely on the Azure platform side; follow the incident and communicate status',
      },
      { id: 'c', text: 'Advisor has disabled the database because of a cost recommendation' },
      { id: 'd', text: 'A resource lock is blocking database connections' },
    ],
    correct: ['b'],
    explanation:
      'A matching Service Health incident indicates a platform problem, so you track it and communicate rather than rolling back working code. Advisor never disables resources, and locks affect management operations, not data-plane connections.',
  },
]
