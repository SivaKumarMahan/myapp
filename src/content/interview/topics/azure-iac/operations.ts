import type { InterviewQuestion } from '../../../types'

/** Running IaC in production: drift, policy as code, pipelines and failure scenarios. */
export const azureIacOperationsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-aziac-17',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'During an incident someone added an NSG rule in the portal to production. The IaC is in Bicep for one app and Terraform for another. How do you find and handle the drift in each?',
    probing:
      'Drift in both tools. The key difference: Terraform detects drift from state; Bicep only when you what-if or redeploy, and incremental mode will not remove extra things.',
    answer: [
      'First, the change was made for a reason during an incident, so I would **find out why** - the activity log shows who changed the NSG and when - before deciding whether the code or the portal is right. Reverting an emergency fix blindly is how incidents repeat.',
      'In **Terraform**, drift appears on the next plan, because Terraform refreshes state against Azure. `terraform plan -refresh-only` shows only the drift. If the rule was added as a separate `azurerm_network_security_rule`, Terraform does not know about it and will not remove it; if the NSG manages rules inline, the plan will propose removing the unknown rule. Then I either **codify it** (add the rule to code, plan is clean) or **apply** to revert it.',
      'In **Bicep**, there is no refresh step - drift appears only when I run **what-if** or redeploy. And there is a subtlety: if the rule is inline in the NSG’s `securityRules` array, redeploying overwrites the array and removes the portal rule. If the portal created a separate child resource and the template does not mention it, incremental mode leaves it there forever. A **deployment stack** with deny settings would have blocked the portal change in the first place.',
      'The durable fix is detection and prevention: a scheduled `terraform plan -detailed-exitcode` and a scheduled what-if that alert on changes, activity-log alerts on writes to production network resources, and removing portal write access (or deny settings) so the IaC path is the only path - with a documented break-glass procedure for incidents.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Handling drift after an incident',
        caption: 'Find out why before reverting; then codify or revert, and stop it recurring.',
        nodes: [
          { label: 'Portal change during incident', tone: 'warning' },
          {
            label: 'Activity log: who and why',
            detail: 'Before deciding anything',
            tone: 'accent',
          },
          { label: 'Detect in each tool', detail: 'plan -refresh-only, or what-if' },
          {
            label: 'Codify or revert',
            detail: 'Code wins or reality wins - decide',
            branch: { label: 'Apply blindly', detail: 'Reverts the emergency fix' },
          },
          { label: 'Scheduled drift checks', detail: 'Alert on any difference' },
          {
            label: 'Deny settings or no portal write',
            detail: 'Break-glass documented',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Who changed it?',
        language: 'bash',
        code: `az monitor activity-log list -g rg-orders-prod --offset 2d \\
  --query "[?contains(operationName.value, 'Microsoft.Network/networkSecurityGroups')].{when:eventTimestamp, who:caller, op:operationName.value, status:status.value}" \\
  -o table`,
      },
      {
        title: 'Scheduled drift detection for both tools',
        language: 'yaml',
        code: `schedules:
  - cron: '0 6 * * *'
    displayName: Daily drift check
    branches:
      include: [main]
    always: true

steps:
  - task: AzureCLI@2
    displayName: Terraform drift
    inputs:
      azureSubscription: sc-orders-prod-read
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: |
        terraform init -input=false
        terraform plan -refresh-only -detailed-exitcode -input=false || rc=$?
        if [ "\${rc:-0}" -eq 2 ]; then echo "##vso[task.logissue type=warning]Terraform drift detected"; exit 1; fi

  - task: AzureCLI@2
    displayName: Bicep drift
    inputs:
      azureSubscription: sc-orders-prod-read
      scriptType: bash
      scriptLocation: inlineScript
      inlineScript: |
        az deployment group what-if -g rg-app-prod -f main.bicep -p prod.bicepparam \\
          --exclude-change-types NoChange Ignore`,
      },
    ],
    deeper: [
      'Inline versus separate child resources is a real design choice in both tools. Inline rules make the code authoritative for the whole set - extra rules get removed. Separate rule resources allow other owners to add rules, but then nobody is authoritative and drift can hide.',
    ],
    traps: [
      'Reverting the emergency change without asking why it was made.',
      'Assuming a Bicep redeploy in incremental mode removes resources that were added by hand.',
      'Detecting drift only when the next feature is deployed, weeks later.',
    ],
    followUps: [
      'How would you allow emergency changes without permanent drift?',
      'Why is inline versus separate NSG rules a design decision?',
    ],
    tags: ['scenario', 'drift', 'terraform', 'bicep', 'operations'],
  },
  {
    id: 'itv-aziac-18',
    level: 'advanced',
    kind: 'open',
    prompt: 'What does policy as code mean on Azure, and how do you combine it with IaC?',
    probing:
      'Governance maturity. They want two layers: Azure Policy as the runtime guard, and pre-deployment checks in the pipeline for fast feedback.',
    answer: [
      'Policy as code has two layers that complement each other. **Azure Policy** is the runtime guardrail: definitions, initiatives and assignments that audit or deny non-compliant resources however they are created - portal, CLI, Bicep, Terraform. **Pre-deployment checks** in the pipeline scan the IaC itself and fail a pull request before anything reaches Azure.',
      'For Azure Policy, the definitions and assignments are themselves **code** - Bicep or Terraform at management group scope, or a framework such as **Enterprise Policy as Code (EPAC)** - reviewed and deployed through a pipeline, with exemptions also in code and time-limited. I roll new rules out as **audit** first, measure the compliance impact, fix existing resources, and only then switch to **deny**.',
      'For pre-deployment checks, **PSRule for Azure** evaluates Bicep and ARM against the Well-Architected rules, and **Checkov** or similar tools scan Terraform plans. They give the developer the answer in the PR - "storage account allows public blob access" - rather than a deployment failure from a deny policy ten minutes into a release.',
      'The two layers must agree. If the pipeline allows something policy denies, the developer finds out late; if policy is weaker than the pipeline, the portal is a loophole. I keep a mapping between the org’s policy initiative and the pipeline rules and test both on the same examples.',
    ],
    deeper: [
      '`deployIfNotExists` and `modify` policies change resources after deployment - for example, adding diagnostic settings or tags. That is drift from the IaC tool’s point of view, so either the IaC should declare the same thing or the tool should ignore those properties, otherwise every plan shows a change.',
      'Deny policies apply to what-if too in the sense that the deployment will fail validation; running what-if in the pipeline surfaces many policy violations early, but not all effects are evaluated there.',
    ],
    code: [
      {
        title: 'Assign a built-in policy in audit mode first',
        language: 'bicep',
        code: `targetScope = 'managementGroup'

@allowed([ 'Audit', 'Deny', 'Disabled' ])
param effect string = 'Audit'   // flip to Deny after remediation

resource noPublicBlob 'Microsoft.Authorization/policyAssignments@2024-04-01' = {
  name: 'deny-public-blob'
  properties: {
    displayName: 'Storage accounts should prevent public blob access'
    policyDefinitionId: tenantResourceId('Microsoft.Authorization/policyDefinitions', '<built-in-definition-guid>')
    parameters: { effect: { value: effect } }
    enforcementMode: 'Default'
  }
}`,
        placeholders: ['<built-in-definition-guid>'],
      },
      {
        title: 'Pre-deployment checks in a PR pipeline',
        language: 'yaml',
        code: `steps:
  - task: ps-rule-assert@2          # PSRule for Azure on Bicep files
    inputs:
      modules: PSRule.Rules.Azure
      inputType: repository
      inputPath: infra/
  - script: |
      pip install checkov
      terraform -chdir=tf plan -out=tfplan
      terraform -chdir=tf show -json tfplan > tfplan.json
      checkov -f tfplan.json --framework terraform_plan
    displayName: Checkov on the Terraform plan`,
      },
    ],
    traps: [
      'Switching a new policy straight to deny across production.',
      'Pipeline rules and Azure Policy disagreeing, so developers learn about violations at deploy time.',
      'Exemptions created in the portal with no expiry.',
    ],
    followUps: [
      'How do deployIfNotExists policies interact with Terraform plans?',
      'How would you test a new policy before assigning it?',
    ],
    tags: ['policy as code', 'azure policy', 'governance', 'psrule', 'checkov'],
  },
  {
    id: 'itv-aziac-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Describe how you would run Bicep or Terraform in a CI/CD pipeline.',
    probing:
      'End-to-end IaC delivery. They want validation on PRs, a reviewed plan, the same artefact applied, approvals and identity.',
    answer: [
      'On every **pull request**: lint and build (`az bicep lint`, `terraform fmt -check` and `validate`), run policy checks (PSRule, Checkov), and produce a **what-if or plan** against the real target, posted to the PR so reviewers see the effect on Azure. These runs use a **read-only** identity.',
      'On **merge to main**: produce the plan again and publish it as an artifact, then deploy **environment by environment** - dev, test, prod - with **approvals and checks** on the production environment. For Terraform I apply the **saved plan file**, so what was approved is exactly what runs; if the plan is stale, the apply fails rather than doing something different.',
      'Identity is **workload identity federation**, one service connection per environment, and the production connection has branch control so only main can use it. State for Terraform is in a locked-down storage account with Entra auth.',
      'And the pipeline is the **only** path to production: people have read access in the portal, drift is detected on a schedule, and the break-glass process is documented.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'IaC delivery pipeline',
        caption:
          'Review the effect, apply the same plan, and gate production on people and checks.',
        nodes: [
          { label: 'Pull request', detail: 'Lint, validate, policy scan', tone: 'accent' },
          { label: 'Plan or what-if posted', detail: 'Read-only identity' },
          { label: 'Merge to main', detail: 'Plan saved as an artifact' },
          { label: 'Apply to dev and test', detail: 'Same template and plan' },
          {
            label: 'Approval for prod',
            detail: 'Branch control on the connection',
            branch: { label: 'Plan is stale', detail: 'Apply fails - re-plan' },
          },
          { label: 'Apply saved plan to prod', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Terraform plan and apply stages in Azure Pipelines',
        language: 'yaml',
        code: `stages:
  - stage: Plan
    jobs:
      - job: plan
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: sc-orders-prod-plan      # read-only + state access
              scriptType: bash
              scriptLocation: inlineScript
              addSpnToEnvironment: true
              inlineScript: |
                export ARM_USE_OIDC=true ARM_CLIENT_ID=$servicePrincipalId \\
                  ARM_TENANT_ID=$tenantId ARM_OIDC_TOKEN=$idToken
                terraform init -input=false
                terraform plan -input=false -out=tfplan
          - publish: tfplan
            artifact: plan

  - stage: Apply
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: apply
        environment: prod          # approvals and checks
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - download: current
                  artifact: plan
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: sc-orders-prod
                    scriptType: bash
                    scriptLocation: inlineScript
                    addSpnToEnvironment: true
                    inlineScript: |
                      export ARM_USE_OIDC=true ARM_CLIENT_ID=$servicePrincipalId \\
                        ARM_TENANT_ID=$tenantId ARM_OIDC_TOKEN=$idToken
                      terraform init -input=false
                      terraform apply -input=false $(Pipeline.Workspace)/plan/tfplan`,
      },
    ],
    traps: [
      'Running `terraform apply -auto-approve` without a saved plan, so what runs is not what was reviewed.',
      'Using the same highly privileged identity for PR plans from any branch.',
      'Skipping plan review because "it is only infrastructure".',
    ],
    followUps: [
      'Why apply a saved plan rather than re-planning?',
      'Plan files contain secrets - how do you protect the artifact?',
    ],
    tags: ['pipelines', 'terraform', 'bicep', 'ci/cd'],
  },
  {
    id: 'itv-aziac-20',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A pipeline deployed a Bicep template in Complete mode to a shared resource group and deleted a production database that belonged to another team. What now?',
    probing:
      'Recovery under pressure plus prevention. They want restore paths per resource type and the structural fixes.',
    answer: [
      'First, **stop the bleeding**: disable the pipeline so it cannot run again, and tell the owning team and the incident channel. Then establish exactly what was deleted - the **activity log** for the resource group lists every delete operation with the deployment as the caller.',
      'Recovery depends on the resource. A deleted **Azure SQL database** can be restored from its automatic backups for a period after deletion - the deleted databases list on the server shows it and `az sql db restore` with `--deleted-time` brings it back as a new database. If the whole **server** was deleted, recovery is much harder and may need support. **Key Vaults** with soft delete can be recovered; **storage accounts** can sometimes be recovered within a short window. Anything without soft delete or backups is gone and must be rebuilt from its IaC.',
      'Once service is restored, fix the causes. **Never use Complete mode on a shared resource group** - the root problem is two teams’ resources in one group. Replace Complete mode with a **deployment stack**, which only deletes what it created. Add a **what-if gate** that fails on deletes. Put **CanNotDelete locks** on stateful production resources. And scope the pipeline’s identity to the resources it owns, not the whole group.',
      'In the post-incident review I would focus on how a destructive mode reached production unreviewed, rather than on the person who ran it.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Recovering from a Complete mode deletion',
        caption:
          'Stop, list, restore per resource type, then remove the conditions that allowed it.',
        nodes: [
          { label: 'Disable the pipeline', detail: 'No second run', tone: 'danger' },
          { label: 'Activity log: what was deleted', detail: 'Caller is the deployment' },
          { label: 'Restore per resource type', detail: 'SQL deleted-DB restore, KV recover' },
          { label: 'Rebuild the rest from IaC', detail: 'Anything without soft delete' },
          {
            label: 'Stacks, what-if gate, locks',
            detail: 'One team per resource group',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Find the deletions and restore the database',
        language: 'bash',
        code: `az monitor activity-log list -g rg-shared-prod --offset 6h \\
  --query "[?operationName.value=='Microsoft.Sql/servers/databases/delete'].{when:eventTimestamp, caller:caller, id:resourceId}" -o table

# Deleted databases still restorable on the server
az sql db list-deleted -g rg-shared-prod -s sql-shared-prod -o table

az sql db restore -g rg-shared-prod -s sql-shared-prod -n billing \\
  --deleted-time "2026-09-27T09:41:12Z" --dest-name billing \\
  --time "2026-09-27T09:40:00Z"`,
      },
      {
        title: 'Protect stateful resources with a lock in Bicep',
        language: 'bicep',
        code: `resource db 'Microsoft.Sql/servers/databases@2023-08-01-preview' existing = {
  name: 'sql-shared-prod/billing'
}

resource dbLock 'Microsoft.Authorization/locks@2020-05-01' = {
  name: 'billing-no-delete'
  scope: db
  properties: { level: 'CanNotDelete', notes: 'Stateful production data' }
}`,
      },
    ],
    deeper: [
      'Locks make a Complete mode deployment **fail** rather than delete, which is exactly the behaviour you want on stateful resources - but they also block legitimate deletes, so they belong on data, not on everything.',
    ],
    traps: [
      'Rerunning the pipeline "to fix it" before understanding what happened.',
      'Restoring the database and leaving Complete mode in place.',
      'Blaming the individual instead of the process that allowed it.',
    ],
    followUps: [
      'How long can a deleted Azure SQL database be restored?',
      'How would a deployment stack have behaved differently?',
    ],
    tags: ['scenario', 'complete mode', 'recovery', 'bicep', 'incident'],
  },
  {
    id: 'itv-aziac-21',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'A Bicep deployment creates a managed identity and a role assignment for it. It fails intermittently with PrincipalNotFound, and on redeploy sometimes with RoleAssignmentExists. Why, and how do you fix it?',
    probing:
      'A very common real-world Bicep failure. They want Entra replication delay, principalType, and deterministic guid() names.',
    answer: [
      "**PrincipalNotFound** is a replication race. The managed identity is created in Entra ID, and a moment later ARM tries to create a role assignment for its principal ID - but the role assignment service checks Entra and the new principal has not replicated there yet. Setting **`principalType: 'ServicePrincipal'`** on the role assignment tells ARM what kind of principal it is, which avoids the lookup that fails and fixes the race.",
      '**RoleAssignmentExists** means an assignment for the same principal, role and scope already exists **under a different name**. Role assignment names must be GUIDs, and if the name is generated with something random, or with different inputs than whoever created the first one, a redeploy tries to create a duplicate. The fix is a **deterministic name**: `guid(scope, principalId, roleDefinitionId)`, so the same inputs always produce the same name and redeployments are idempotent.',
      'If the conflicting assignment was created by hand or by another template, I delete it once and let the template own it from then on.',
    ],
    code: [
      {
        title: 'An idempotent, race-free role assignment',
        language: 'bicep',
        code: `resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-orders-api'
  location: resourceGroup().location
}

resource sa 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

var blobDataContributor = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')

resource ra 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(sa.id, uami.id, blobDataContributor)       // deterministic
  scope: sa
  properties: {
    principalId: uami.properties.principalId
    roleDefinitionId: blobDataContributor
    principalType: 'ServicePrincipal'                    // avoids the replication race
  }
}`,
      },
      {
        title: 'Find the conflicting assignment',
        language: 'bash',
        code: `az role assignment list --scope <storage-account-id> \\
  --query "[?roleDefinitionName=='Storage Blob Data Contributor'].{name:name, principal:principalId, createdBy:createdBy}" -o table`,
        placeholders: ['<storage-account-id>'],
      },
    ],
    traps: [
      'Adding a `dependsOn` or a sleep script - the dependency already exists; the race is in Entra replication.',
      'Using `newGuid()` for role assignment names, which makes every deployment create a duplicate.',
      'Using the identity’s resource ID where the principal ID is required.',
    ],
    followUps: [
      'Why does guid() take several arguments?',
      'Which roles can create role assignments, and how would you constrain them?',
    ],
    tags: ['scenario', 'bicep', 'rbac', 'role assignments', 'troubleshooting'],
  },
]
