import type { InterviewQuestion } from '../../../types'

/** Cloud Adoption Framework, landing zones, subscription design and platform incidents. */
export const azureFundamentalsGovernanceQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azf-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the Cloud Adoption Framework, and what is an Azure landing zone?',
    probing:
      'They want the organisational view (CAF) connected to the concrete artefact (a landing zone), and the platform versus application split.',
    answer: [
      'The **Cloud Adoption Framework** is Microsoft’s guidance for how an organisation adopts Azure, end to end: define the **strategy**, **plan** the migration and skills, get **ready** by building the foundation, then **adopt** by migrating and modernising, while continuously **governing**, **securing** and **managing** the estate.',
      'The "ready" phase is where the **landing zone** comes from. A landing zone is a pre-built, governed environment that workloads land into: a management group hierarchy, subscriptions, identity and access, networking, policy guardrails, logging and security baselines, all deployed as code.',
      'The Azure landing zone reference architecture splits it in two. **Platform landing zones** are shared services owned by a central team - identity, connectivity with the hub network or Virtual WAN, and management with central logging. **Application landing zones** are the subscriptions workload teams receive, already wired to the hub, with policies applied from the management groups above them.',
      'The benefit is that a team asking for a new environment gets a compliant subscription in hours from a vending pipeline, instead of each team inventing its own networking, logging and security.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'The landing zone management group tree',
        caption: 'Policy assigned at a management group applies to every subscription below it.',
        root: {
          label: 'Tenant root group',
          children: [
            {
              label: 'Org management group',
              detail: 'Org-wide policy and RBAC',
              tone: 'accent',
              children: [
                {
                  label: 'Platform',
                  detail: 'Identity, Connectivity, Management subs',
                },
                {
                  label: 'Landing zones',
                  detail: 'Corp (private) and Online (internet-facing)',
                  tone: 'success',
                },
                { label: 'Sandbox', detail: 'Loose policy, no hub connection', tone: 'muted' },
                {
                  label: 'Decommissioned',
                  detail: 'Subscriptions on their way out',
                  tone: 'muted',
                },
              ],
            },
          ],
        },
      },
    ],
    code: [
      {
        title: 'Deploy a management group structure at tenant scope',
        language: 'bicep',
        code: `targetScope = 'managementGroup'

param prefix string = 'contoso'

resource org 'Microsoft.Management/managementGroups@2023-04-01' = {
  scope: tenant()
  name: prefix
  properties: { displayName: 'Contoso' }
}

resource landingZones 'Microsoft.Management/managementGroups@2023-04-01' = {
  scope: tenant()
  name: '\${prefix}-landingzones'
  properties: {
    displayName: 'Landing zones'
    details: { parent: { id: org.id } }
  }
}`,
        explanation:
          'In practice most teams start from the Azure Verified Modules landing zone accelerator rather than hand-writing this.',
      },
    ],
    traps: [
      'Describing a landing zone as "a VNet" or "a subscription". It is the whole governed foundation.',
      'Confusing CAF (how an organisation adopts) with the Well-Architected Framework (how a workload is built).',
    ],
    followUps: [
      'What is the difference between the Corp and Online landing zone groups?',
      'Who owns the platform subscriptions and who owns application landing zones?',
    ],
    tags: ['cloud adoption framework', 'landing zones', 'management groups', 'governance'],
  },
  {
    id: 'itv-azf-17',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Design subscription vending for a platform team. A product team asks for a new production environment - what happens, end to end?',
    probing:
      'Platform engineering maturity. A good answer is a pipeline, not a ticket, and names what the new subscription gets automatically.',
    answer: [
      'The request is a **pull request**, not a ticket. The team adds a small parameter file - workload name, environment, cost center, owner group, required address space size, whether it needs connectivity to the hub. Review is by the platform team, and merge triggers the vending pipeline.',
      'The pipeline creates the **subscription** through a subscription alias under the billing account, and places it into the right **management group** - Corp or Online - so policy is inherited from the moment it exists. It **registers the resource providers** the platform supports, deploys a **budget**, and assigns the team’s Entra group the roles they need - usually Contributor or a custom role at subscription scope, with Owner-level rights only through PIM.',
      'For networking it allocates an **address range from IPAM** so nothing overlaps, creates the spoke VNet and **peers it to the hub** or connects it to the Virtual WAN hub, with route tables pointing at the firewall and DNS set to the central resolver. It configures **diagnostic settings** to the central Log Analytics workspace and turns on Defender for Cloud plans.',
      'Finally it creates a **workload identity federation** service connection or GitHub OIDC credential so the team’s own pipelines can deploy into their subscription without secrets. The team gets a working, compliant environment in under an hour, and every decision is in Git.',
    ],
    code: [
      {
        title: 'Create a subscription with an alias (billing scope needs EA/MCA rights)',
        language: 'bicep',
        code: `targetScope = 'tenant'

param billingScope string   // e.g. an MCA invoice section resource ID
param workload string
param mgId string

resource sub 'Microsoft.Subscription/aliases@2021-10-01' = {
  name: 'sub-\${workload}-prod'
  properties: {
    displayName: 'sub-\${workload}-prod'
    billingScope: billingScope
    workload: 'Production'
    additionalProperties: {
      managementGroupId: tenantResourceId('Microsoft.Management/managementGroups', mgId)
      tags: { workload: workload, environment: 'prod' }
    }
  }
}

output subscriptionId string = sub.properties.subscriptionId`,
      },
      {
        title: 'The vending pipeline, stage by stage',
        language: 'yaml',
        code: `stages:
  - stage: subscription
    jobs:
      - job: create
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: sc-platform-vending   # workload identity federation
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az deployment tenant create -l uksouth \\
                  -f sub-alias.bicep -p @requests/$(workload).json
  - stage: baseline
    dependsOn: subscription
    jobs:
      - job: baseline
        steps:
          - script: echo "providers, budget, RBAC, spoke VNet + peering, diagnostics, Defender"`,
      },
    ],
    deeper: [
      'Keep policy out of the vending pipeline. The subscription inherits it from the management group; the pipeline only decides **which** group. That way changing a guardrail is one change, not fifty.',
      'IPAM is the step people forget. Without a central record of allocated ranges, the fifth spoke overlaps the second and peering fails - or worse, on-premises routes break. Azure Virtual Network Manager has an IPAM feature for this.',
      'Decommissioning deserves the same automation: move to a Decommissioned management group that denies new resources, cancel after a grace period.',
    ],
    traps: [
      'Handing out Owner on the subscription permanently.',
      'Assigning policies per subscription in the pipeline instead of inheriting them.',
      'Using a client secret for the team’s service connection.',
    ],
    followUps: [
      'How do you avoid overlapping address spaces between spokes?',
      'What does the team get if they need an internet-facing app instead?',
    ],
    tags: ['landing zones', 'subscription vending', 'platform engineering', 'bicep'],
  },
  {
    id: 'itv-azf-18',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'A deployment that worked last week now fails. One error says RequestDisallowedByPolicy, another says the regional vCPU quota is exceeded. Walk me through both.',
    probing:
      'Reading ARM errors precisely and knowing which team owns the fix. Policy denial and quota are both guardrails, handled very differently.',
    answer: [
      '**RequestDisallowedByPolicy** means an Azure Policy with a `deny` effect blocked the request. The error body names the **policy assignment** and **definition**. I read that first rather than guessing, then look at the definition to see which property failed - often a new policy like "storage accounts must disable public network access", or a tag requirement, assigned at a management group since last week.',
      'Then I decide which side is wrong. Usually the template should change to comply - set `publicNetworkAccess` to `Disabled`, add the tag. If there is a legitimate reason it cannot, the answer is a **policy exemption** with an expiry date raised through the platform team, not disabling the policy. I would also add `az deployment what-if` or policy checks to the PR pipeline so this is caught before merge next time.',
      'The **quota** error is different: the subscription has hit its limit on vCPUs for that VM family in that region, often because another team’s scale set grew in the same subscription. I check current usage against the limit, and either free capacity, pick a family with headroom, or request an increase through the Quotas service - which for large increases can take time, so it belongs in capacity planning, not in the middle of a release.',
      'Both errors have the same lesson: guardrails and limits are per scope, so shared subscriptions make teams affect each other. That is an argument for subscription-per-workload.',
    ],
    code: [
      {
        title: 'Find out which policy denied the request',
        language: 'bash',
        code: `# The deployment error names the assignment; show it and its definition
az deployment group show -g rg-app -n main \\
  --query "properties.error.details[].{code:code, message:message}" -o jsonc

az policy assignment show --name <assignment-name> \\
  --scope /providers/Microsoft.Management/managementGroups/mg-corp \\
  --query "{policy:policyDefinitionId, effect:parameters.effect}"

# Non-compliant resources for that assignment
az policy state list --filter "policyAssignmentName eq '<assignment-name>'" --top 20 -o table`,
        placeholders: ['<assignment-name>'],
      },
      {
        title: 'Check quota headroom before asking for more',
        language: 'bash',
        code: `az vm list-usage -l uksouth \\
  --query "[?contains(name.value, 'DSv5') || name.value=='cores'].{name:localName, used:currentValue, limit:limit}" -o table

# Request an increase through the Quota API (needs the quota extension)
az quota update --resource-name standardDSv5Family \\
  --scope /subscriptions/<sub-id>/providers/Microsoft.Compute/locations/uksouth \\
  --limit-object value=200 --resource-type dedicated`,
        placeholders: ['<sub-id>'],
      },
      {
        title: 'Catch policy denials in the PR, not the release',
        language: 'bash',
        code: `az deployment group what-if -g rg-app -f main.bicep -p @prod.json --result-format FullResourcePayloads`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which guardrail stopped the deployment?',
        caption: 'Read the error code; each one has a different owner and a different fix.',
        question: 'What does the ARM error code say?',
        branches: [
          {
            condition: 'RequestDisallowedByPolicy',
            result: 'Fix the template, or request an exemption',
            detail: 'Platform team owns the policy',
            tone: 'warning',
          },
          {
            condition: 'QuotaExceeded or OperationNotAllowed',
            result: 'Free capacity or raise the quota',
            detail: 'Per subscription, per region, per family',
          },
          {
            condition: 'AuthorizationFailed',
            result: 'Missing RBAC at that scope',
            tone: 'danger',
          },
          {
            condition: 'ScopeLocked',
            result: 'A resource lock blocks the change',
            tone: 'muted',
          },
        ],
      },
    ],
    deeper: [
      'Some policy effects do not deny: `audit` only reports, `modify` changes the request, and `deployIfNotExists` deploys something after. A deployment "working but resources look different" is often a `modify` policy.',
      'SKU restrictions are not quota. `az vm list-skus` showing `NotAvailableForSubscription` means the size is restricted in that region or zone for your subscription and needs a different support request.',
    ],
    traps: [
      'Asking for the policy to be disabled instead of fixing the template or scoping an exemption.',
      'Requesting a quota increase in the middle of an outage and expecting it instantly.',
      'Confusing a SKU restriction with a quota limit.',
    ],
    followUps: [
      'How would you test templates against policy before deployment?',
      'What is the difference between a policy exemption and an exclusion?',
    ],
    tags: ['scenario', 'azure policy', 'quota', 'troubleshooting', 'arm'],
  },
  {
    id: 'itv-azf-19',
    level: 'advanced',
    kind: 'open',
    prompt:
      'When would you create a new subscription rather than a new resource group? How do you decide the subscription boundaries?',
    probing:
      'Design judgement. Strong answers cite limits, billing, blast radius and RBAC boundaries, and avoid both extremes.',
    answer: [
      'A **resource group** is enough when the resources share a lifecycle and an owner inside an existing environment. A **new subscription** is warranted when you need a different boundary for one of four things.',
      '**Isolation and blast radius**: production should not share a subscription with development, so a mistaken role assignment or a runaway script in dev cannot touch prod. **Access**: subscriptions give a clean top-level scope for a team’s rights and for Owner-level PIM roles. **Billing and attribution**: a subscription maps naturally onto a cost center or product. **Limits and quotas**: many limits - vCPUs per region, some networking and resource counts, ARM throttling - are per subscription, so a big workload can starve its neighbours.',
      'The modern default in the landing zone guidance is **one subscription per workload per environment** - `sub-shop-prod`, `sub-shop-nonprod` - vended automatically. Subscriptions are free, and automation removes the overhead that used to make people avoid them.',
      'The opposite mistake is splitting too finely, such as one subscription per microservice, which multiplies networking, private DNS links and governance for no gain. I would keep tightly coupled services of one product together.',
    ],
    code: [
      {
        title: 'Moving a resource group’s contents to a new subscription',
        language: 'bash',
        code: `# Validate first - not every resource type supports moving, and dependents must move together
az rest --method post \\
  --url "https://management.azure.com/subscriptions/<old-sub>/resourceGroups/rg-shop/validateMoveResources?api-version=2021-04-01" \\
  --body '{
    "resources": ["<resource-id-1>", "<resource-id-2>"],
    "targetResourceGroup": "/subscriptions/<new-sub>/resourceGroups/rg-shop"
  }'

az resource move --destination-subscription-id <new-sub> \\
  --destination-group rg-shop --ids <resource-id-1> <resource-id-2>`,
        placeholders: ['<old-sub>', '<new-sub>', '<resource-id-1>', '<resource-id-2>'],
      },
    ],
    deeper: [
      'Moving a subscription to **another tenant** removes every RBAC assignment and breaks managed identities and Key Vault access tied to the old tenant. It is a migration, not a move.',
      'A move changes the resource ID, so anything referencing the old ID - alerts, dashboards, Bicep parameters, scripts - needs updating.',
    ],
    traps: [
      'Putting prod and non-prod in one subscription and separating only by resource group.',
      'One subscription per microservice.',
      'Assuming all resource types can be moved between subscriptions.',
    ],
    followUps: [
      'Which limits are per subscription versus per region?',
      'What breaks when you move a subscription to a different tenant?',
    ],
    tags: ['subscriptions', 'design', 'landing zones', 'governance'],
  },
  {
    id: 'itv-azf-20',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'It is 3am. Your app in West Europe is down and you suspect an Azure platform issue. How do you confirm it, what do you do right now, and what do you change afterwards?',
    probing:
      'Incident handling on a cloud platform: distinguishing your fault from theirs quickly, using the right health signals, acting on a plan, and a blameless follow-up.',
    answer: [
      'First I **confirm scope quickly** rather than assuming. **Azure Service Health** in the portal shows incidents affecting my subscriptions and regions - more accurate than the public status page, which only shows broad events. **Resource Health** on the specific resources says whether the platform thinks each one is available, degraded or unavailable, and often why.',
      'At the same time I check **our own recent changes**: a deployment in the last hour, a certificate expiry, a policy or network change. Most "Azure is down" incidents are our own change, and the activity log answers that in a minute.',
      'If it really is regional, I follow the **DR runbook** - declare the incident, decide on failover against RTO and RPO, fail the data tier over first, then let traffic shift through Front Door, and communicate status regularly. If we have no second region, the options are to wait, or to redeploy into another region from IaC and restore from geo-redundant backups, which is why those backups and templates must already exist.',
      'Afterwards, a **blameless post-incident review**: how long until we knew it was the platform, did the runbook work, was the RTO met. Typical actions are Service Health **alerts** routed to the on-call rotation so we hear from Azure before customers, zone-redundancy where we lacked it, and a scheduled failover test.',
    ],
    code: [
      {
        title: 'Service Health and Resource Health from the CLI',
        language: 'text',
        code: `// Azure Resource Graph: active service health events for my subscriptions
servicehealthresources
| where type == "microsoft.resourcehealth/events"
| extend status = tostring(properties.Status), level = tostring(properties.Level)
| where status == "Active"
| project title = tostring(properties.Title), level, eventType = tostring(properties.EventType),
          impactStart = todatetime(properties.ImpactStartTime)`,
        explanation: 'Run with az graph query -q "..." or in Resource Graph Explorer.',
      },
      {
        title: 'Alert the on-call when Azure declares an incident',
        language: 'bash',
        code: `az monitor activity-log alert create -g rg-ops -n svc-health-weu \\
  --scopes /subscriptions/<sub-id> \\
  --condition category=ServiceHealth \\
  --action-group /subscriptions/<sub-id>/resourceGroups/rg-ops/providers/microsoft.insights/actionGroups/ag-oncall`,
        placeholders: ['<sub-id>'],
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Is it us or is it Azure?',
        caption: 'Check your own recent changes in parallel - they are the more common cause.',
        nodes: [
          { label: 'Alert: app down', tone: 'danger' },
          { label: 'Service Health for my subs', detail: 'Region and service incidents' },
          { label: 'Resource Health per resource', detail: 'Available, degraded, unavailable' },
          {
            label: 'Activity log: our changes',
            detail: 'Deploys, certs, network',
            branch: { label: 'Our change', detail: 'Roll back', tone: 'warning' },
          },
          { label: 'Platform incident: run DR plan', tone: 'accent' },
          { label: 'Post-incident review', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'Service Health also publishes **planned maintenance** and **health advisories** - retirements and breaking changes - which are the cheap way to avoid a future incident.',
      'After a platform incident Microsoft publishes a **Post Incident Review** for affected customers. Reading it tells you whether zone redundancy would have helped, which is the input for the design change.',
    ],
    traps: [
      'Checking the public status page only.',
      'Assuming Azure is at fault without checking your own deployments.',
      'Discovering during the incident that the DR templates or backups do not exist.',
    ],
    followUps: [
      'What is the difference between Service Health and Resource Health?',
      'How would you make sure you hear about platform incidents before customers do?',
    ],
    tags: ['scenario', 'incident', 'service health', 'resource health', 'disaster recovery'],
  },
]
