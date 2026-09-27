import type { InterviewQuestion } from '../../../types'

/** Defender for Cloud, Sentinel, Key Vault and Azure Policy security baselines. */
export const azureMonitoringSecurityQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azmon-8',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Microsoft Defender for Cloud, and what is the secure score?',
    probing:
      'Security posture basics. They want the split between posture management (CSPM) and workload protection, and what the score actually measures.',
    answer: [
      'Defender for Cloud does two jobs. **Cloud security posture management (CSPM)** continuously assesses your resources against a benchmark - by default the **Microsoft cloud security benchmark** - and produces **recommendations** such as "storage accounts should restrict network access" or "MFA should be enabled for accounts with owner permissions". The foundational CSPM tier is free; the paid **Defender CSPM** plan adds attack path analysis, a cloud security graph explorer and agentless scanning.',
      '**Workload protection** is the paid Defender plans per resource type - Defender for Servers, Storage, SQL, Containers, Key Vault, App Service, Resource Manager and others. They detect **threats** at runtime - malware uploaded to storage, suspicious sign-ins to a SQL server, crypto-mining on a VM - and raise **security alerts**.',
      'The **secure score** summarises posture: it is calculated from your recommendations, weighted by importance, so fixing high-impact recommendations moves it most. It is a prioritisation tool - it tells you where to spend effort next - not a measure of whether you are under attack. Threat alerts do not change it.',
    ],
    code: [
      {
        title: 'Posture from the CLI and from Resource Graph',
        language: 'bash',
        code: `az security secure-scores list \\
  --query "[].{name:displayName, current:score.current, max:score.max}" -o table

# Unhealthy recommendations across subscriptions, by severity
az graph query -q "
securityresources
| where type == 'microsoft.security/assessments'
| where properties.status.code == 'Unhealthy'
| summarize count() by severity = tostring(properties.metadata.severity), name = tostring(properties.displayName)
| order by count_ desc" --first 20`,
      },
      {
        title: 'Enable a workload protection plan',
        language: 'bash',
        code: `az security pricing create -n StorageAccounts --tier Standard
az security pricing list --query "value[].{plan:name, tier:pricingTier}" -o table`,
      },
    ],
    traps: [
      'Believing enabling Defender plans raises the secure score by itself.',
      'Treating a high secure score as proof of no active threats.',
      'Enabling every paid plan everywhere without looking at cost or relevance.',
    ],
    followUps: ['Which Defender plans would you enable first?', 'What is attack path analysis?'],
    tags: ['defender for cloud', 'secure score', 'cspm', 'security'],
  },
  {
    id: 'itv-azmon-9',
    level: 'basic',
    kind: 'multi',
    prompt: 'Which statements about the Defender for Cloud secure score are true?',
    options: [
      {
        id: 'a',
        text: 'Remediating unhealthy resources for high-impact recommendations raises the score',
      },
      {
        id: 'b',
        text: 'A new security alert about a suspicious sign-in lowers the score immediately',
      },
      {
        id: 'c',
        text: 'Exempting a resource from a recommendation, with a justification, removes it from the calculation',
      },
      { id: 'd', text: 'Turning on Defender for Servers Plan 2 alone doubles the score' },
      {
        id: 'e',
        text: 'The score is derived from the security recommendations for your resources',
      },
    ],
    correct: ['a', 'c', 'e'],
    probing: 'Whether the candidate understands posture versus threat detection.',
    answer: [
      'The score comes from **recommendations**: fixing unhealthy resources for the weightier recommendations raises it, and a documented **exemption** (mitigated elsewhere, or risk accepted) takes that resource out of the calculation so the score reflects reality.',
      'Security **alerts** are a separate stream - they are about detected threats, not configuration - so they do not move the score. And enabling a paid plan does not directly add points; it adds detections and sometimes new recommendations, which may even lower the score at first.',
    ],
    code: [
      {
        title: 'Exempt a resource with a reason and an expiry',
        language: 'bash',
        code: `az policy exemption create -n legacy-app-waiver \\
  --policy-assignment <assignment-id> \\
  --scope <resource-id> \\
  --exemption-category Waiver \\
  --expires-on 2026-12-31T00:00:00Z \\
  --description "Legacy app retires in Q4; compensating WAF in place"`,
        placeholders: ['<assignment-id>', '<resource-id>'],
      },
    ],
    traps: ['Exempting resources without an expiry, so waivers become permanent.'],
    followUps: ['How would you report secure score trends to leadership?'],
    tags: ['defender for cloud', 'secure score'],
  },
  {
    id: 'itv-azmon-10',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Microsoft Sentinel, and how does it relate to Azure Monitor and Defender?',
    probing:
      'SIEM/SOAR basics and how the pieces fit together. They want connectors, analytics rules, incidents and playbooks.',
    answer: [
      '**Microsoft Sentinel** is Microsoft’s cloud-native **SIEM and SOAR**. It runs on top of a **Log Analytics workspace**: you enable Sentinel on the workspace, and it uses the same tables and KQL.',
      'The flow is: **data connectors** bring in security data - Entra ID sign-ins and audit logs, Azure activity, Defender alerts, Microsoft 365, firewalls, third-party products through syslog/CEF or APIs. **Analytics rules** - scheduled KQL queries, near-real-time rules, and Microsoft’s built-in detections - look for suspicious patterns and create **alerts**, which are grouped into **incidents** for analysts to investigate.',
      '**Automation rules** and **playbooks** (Logic Apps) respond automatically: enrich an incident with user details, disable a compromised account, post to Teams, open a ticket. **Workbooks** give dashboards, **hunting** queries let analysts search proactively, and **UEBA** baselines normal user behaviour.',
      'The relationship: Azure Monitor provides the data platform, Defender for Cloud and the other Defender products provide detections for specific workloads, and Sentinel correlates across all of them. Sentinel is now also available in the unified Microsoft Defender portal alongside Defender XDR.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Sentinel from data to response',
        caption: 'It is a SIEM on a Log Analytics workspace, plus SOAR through Logic Apps.',
        nodes: [
          { label: 'Data connectors', detail: 'Entra, Azure, Defender, firewalls', tone: 'accent' },
          { label: 'Log Analytics workspace', detail: 'Same tables and KQL' },
          { label: 'Analytics rules', detail: 'Scheduled, NRT, Microsoft detections' },
          { label: 'Incidents', detail: 'Grouped alerts for analysts' },
          {
            label: 'Automation and playbooks',
            detail: 'Logic Apps: enrich, contain',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'A simple scheduled analytics rule query: password spray',
        language: 'text',
        code: `SigninLogs
| where TimeGenerated > ago(1h)
| where ResultType in ("50126", "50053")         // bad password, locked account
| summarize failedUsers = dcount(UserPrincipalName), attempts = count() by IPAddress
| where failedUsers > 10
| order by failedUsers desc`,
      },
    ],
    traps: [
      'Describing Sentinel as a separate database. It sits on a Log Analytics workspace.',
      'Ingesting everything into the Sentinel workspace without thinking about cost.',
    ],
    followUps: [
      'How would you keep Sentinel costs under control?',
      'What would your first playbook do?',
    ],
    tags: ['sentinel', 'siem', 'security'],
  },
  {
    id: 'itv-azmon-11',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How do you run Key Vault securely in production, and how do you rotate secrets without downtime?',
    probing:
      'Secret management maturity. They want RBAC, purge protection, private access, logging, and a rotation design that the app tolerates.',
    answer: [
      'For the vault itself: use the **Azure RBAC** permission model rather than legacy access policies, so access is granted with roles like Key Vault Secrets User at vault or secret scope and audited like any other RBAC. Keep **soft delete** and turn on **purge protection** for production, so a deleted vault or secret can be recovered and cannot be purged early. Restrict network access with a **private endpoint** and the firewall. Send the **audit logs** to a workspace and alert on unusual access.',
      'Apps read secrets with **managed identities** - no bootstrap credential. On App Service, Functions and Container Apps I prefer **Key Vault references** in app settings, so the platform fetches the value using the app’s identity.',
      'Rotation without downtime depends on the secret supporting **two valid values at once**. For storage account keys or anything with a primary and secondary, the pattern is: switch consumers to key 2, regenerate key 1, store it, switch back on the next rotation. For a database password, create the new credential, store it as a new **version** of the secret, let consumers pick it up, then retire the old one.',
      'To automate it, Key Vault emits an Event Grid event **SecretNearExpiry** before a secret’s expiry date; a Function subscribed to it performs the rotation and writes the new version. For **keys**, Key Vault has a native **rotation policy**, and certificates from integrated CAs can auto-renew.',
    ],
    deeper: [
      'Consumers must actually pick up new versions. Key Vault references without a version refresh periodically (and on restart); app code that caches a secret forever will keep using the old value until it is redeployed - and fail the moment the old one is revoked.',
      'Better than rotation is removing the secret: managed identity to SQL, Storage, Service Bus and Cosmos DB means there is nothing to rotate at all.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Automated rotation with Event Grid',
        caption: 'Two valid credentials at once is what makes rotation seamless.',
        participants: [
          { id: 'kv', label: 'Key Vault' },
          { id: 'eg', label: 'Event Grid' },
          { id: 'fn', label: 'Rotation Function' },
          { id: 'db', label: 'Target service' },
        ],
        messages: [
          { from: 'kv', to: 'eg', label: 'SecretNearExpiry event' },
          { from: 'eg', to: 'fn', label: 'invoke with secret name' },
          { from: 'fn', to: 'db', label: 'create or regenerate credential' },
          { from: 'db', to: 'fn', label: 'new credential', kind: 'return' },
          { from: 'fn', to: 'kv', label: 'store as new secret version' },
        ],
      },
    ],
    code: [
      {
        title: 'Hardened vault in Bicep',
        language: 'bicep',
        code: `resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-orders-prod'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Disabled'
    networkAcls: { defaultAction: 'Deny', bypass: 'AzureServices' }
  }
}`,
      },
      {
        title: 'Expiry, versions and who read what',
        language: 'bash',
        code: `az keyvault secret set --vault-name kv-orders-prod -n partner-api-key \\
  --value "<new-value>" --expires $(date -u -d '+90 days' '+%Y-%m-%dT%H:%M:%SZ')

az keyvault secret list-versions --vault-name kv-orders-prod -n partner-api-key \\
  --query "[].{version:id, enabled:attributes.enabled, expires:attributes.expires}" -o table`,
        placeholders: ['<new-value>'],
      },
      {
        title: 'Unusual secret access (KQL, resource-specific table)',
        language: 'text',
        code: `AZKVAuditLogs
| where TimeGenerated > ago(1d) and OperationName == "SecretGet"
| summarize reads = count() by CallerIpAddress, Identity = tostring(Identity), ResultType
| order by reads desc`,
      },
    ],
    traps: [
      'Access policies granting "all secret permissions" to a whole team.',
      'Rotating a secret that has only one valid value at a time, causing an outage.',
      'No purge protection, so a malicious delete-and-purge is unrecoverable.',
    ],
    followUps: [
      'How do Key Vault references pick up a new version?',
      'Why is purge protection irreversible?',
    ],
    tags: ['key vault', 'secrets', 'rotation', 'security'],
  },
  {
    id: 'itv-azmon-12',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you use Azure Policy to enforce a security baseline across hundreds of subscriptions?',
    probing:
      'Governance at scale. They want management group assignment, initiatives, the right effects, remediation with managed identity, exemptions, and a safe rollout.',
    answer: [
      'I would assign policy at the **management group** level so every current and future subscription inherits it. The baseline is an **initiative** - a set of policy definitions - starting from the **Microsoft cloud security benchmark** that Defender for Cloud already assigns, plus the organisation’s own rules: allowed regions, required tags, no public IPs on certain subscriptions, TLS minimums, private endpoints for PaaS.',
      'Effects are chosen per rule. **Deny** for things that must never exist, like public blob access. **Audit** or **AuditIfNotExists** for things we want to see but not block yet. **Modify** to add or fix properties such as tags. **DeployIfNotExists** to create missing companions - diagnostic settings, the Azure Monitor Agent, Defender plans. DINE and Modify assignments need a **managed identity** with the right roles, and existing resources are fixed with **remediation tasks**.',
      'The rollout is the part that makes or breaks it: assign new rules in **audit** (or with `enforcementMode: DoNotEnforce`), measure compliance, fix or exempt existing resources, communicate, then switch to **deny**. **Exemptions** are in code, have a category, a justification and an **expiry date**.',
      'Everything is **policy as code** - definitions, initiatives, assignments and exemptions in a repository, deployed through a pipeline - so a change to the baseline is a pull request, not a portal click.',
    ],
    code: [
      {
        title: 'Assign an initiative at a management group with a managed identity',
        language: 'bash',
        code: `az policy assignment create -n security-baseline \\
  --display-name "Contoso security baseline" \\
  --scope /providers/Microsoft.Management/managementGroups/contoso-landingzones \\
  --policy-set-definition <initiative-id> \\
  --mi-system-assigned --location westeurope \\
  --enforcement-mode DoNotEnforce          # observe first

# Later: remediate existing resources for a DINE policy in the initiative
az policy remediation create -n deploy-diag-settings \\
  --management-group contoso-landingzones \\
  --policy-assignment security-baseline \\
  --definition-reference-id deployDiagnosticSettings`,
        placeholders: ['<initiative-id>'],
      },
      {
        title: 'Compliance summary with Resource Graph',
        language: 'text',
        code: `policyresources
| where type == "microsoft.policyinsights/policystates"
| where properties.complianceState == "NonCompliant"
| summarize nonCompliant = count() by policy = tostring(properties.policyDefinitionReferenceId), subscriptionId
| order by nonCompliant desc`,
      },
    ],
    deeper: [
      'Deny policies only act on create and update. Existing non-compliant resources keep running until something touches them, which is why compliance reports and remediation matter as much as the deny itself.',
      'DINE policies can surprise IaC tools: the diagnostic setting they create is drift from Terraform’s point of view. Either declare the same thing in IaC or exclude it from management - decide it once for the whole estate.',
    ],
    traps: [
      'Going straight to deny across production on day one.',
      'Forgetting that DINE and Modify need a managed identity with roles.',
      'Portal-created exemptions with no expiry and no owner.',
    ],
    followUps: [
      'How do you test a new policy before assigning it?',
      'What is the DenyAction effect for?',
    ],
    tags: ['azure policy', 'governance', 'security baseline', 'compliance'],
  },
  {
    id: 'itv-azmon-13',
    level: 'intermediate',
    kind: 'mcq',
    prompt:
      'Every new storage account must automatically get a diagnostic setting that sends logs to the central workspace. Which Azure Policy effect does that?',
    options: [
      { id: 'a', text: 'Deny' },
      { id: 'b', text: 'AuditIfNotExists' },
      { id: 'c', text: 'DeployIfNotExists' },
      { id: 'd', text: 'Append' },
    ],
    correct: ['c'],
    probing: 'Knowing which effect creates a related resource versus which only reports or blocks.',
    answer: [
      '**DeployIfNotExists** checks for a related resource - here a diagnostic setting on the storage account - and if it is missing, runs an ARM deployment to create it. It needs a managed identity on the assignment with permission to create diagnostic settings, and for existing accounts you run a remediation task.',
      '**AuditIfNotExists** would only report the missing setting. **Deny** would block creating storage accounts, which is not the goal. **Append** adds fields to the resource being created, but a diagnostic setting is a separate extension resource, so Append cannot create it.',
    ],
    code: [
      {
        title: 'Find built-in DINE definitions for diagnostic settings',
        language: 'bash',
        code: `az policy definition list \\
  --query "[?policyType=='BuiltIn' && contains(displayName, 'diagnostic') && contains(displayName, 'Storage')].{name:name, displayName:displayName}" \\
  -o table`,
      },
    ],
    traps: [
      'Picking Modify - it changes properties of the resource itself, not separate resources.',
    ],
    followUps: ['What permissions does the assignment’s managed identity need?'],
    tags: ['azure policy', 'deployifnotexists', 'diagnostic settings'],
  },
]
