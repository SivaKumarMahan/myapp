import type { InterviewQuestion } from '../../../types'

/** Tokens and workloads: OAuth2 and OIDC, federation, Key Vault access and credential hygiene. */
export const azureIdentityWorkloadQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azid-15',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain OAuth 2.0 versus OpenID Connect, and which flow you would use for a web app, a SPA, a daemon and a CLI tool.',
    probing:
      'Protocol literacy. They want authorisation versus authentication, the right flow per client type, and PKCE mentioned without prompting.',
    answer: [
      '**OAuth 2.0** is an **authorisation** protocol: it lets a client obtain an **access token** to call an API on behalf of a user or itself. **OpenID Connect** is a thin **authentication** layer on top that adds an **ID token** - a signed statement of who the user is - and standard claims. When an app "signs in with Entra", it is using OIDC; when it then calls Microsoft Graph or your API, it uses the OAuth access token.',
      'For a **server-side web app** I use the **authorization code flow**, with PKCE as well, and a confidential client credential - ideally a certificate or managed identity-backed federated credential rather than a secret. For a **single-page app** it is authorization code **with PKCE** as a public client; the old implicit flow is deprecated because it put tokens in the URL.',
      'For a **daemon** or background service with no user, it is the **client credentials flow**, using application permissions - and if it runs in Azure, a managed identity does this for you. For a **CLI or device without a browser**, the **device code flow** lets the user complete sign-in on another device.',
      'One more that comes up with APIs calling APIs is **on-behalf-of**: the middle-tier API exchanges the user’s token for a new one to a downstream API, keeping the user’s identity in the chain.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'Authorization code flow with PKCE',
        caption: 'The code is useless without the verifier only the real client holds.',
        participants: [
          { id: 'user', label: 'Browser' },
          { id: 'app', label: 'Web app' },
          { id: 'entra', label: 'Entra ID' },
          { id: 'api', label: 'API' },
        ],
        messages: [
          { from: 'app', to: 'user', label: 'Redirect with code_challenge' },
          { from: 'user', to: 'entra', label: 'Sign in, MFA, consent' },
          { from: 'entra', to: 'user', label: 'Redirect with auth code', kind: 'return' },
          { from: 'user', to: 'app', label: 'Deliver auth code' },
          { from: 'app', to: 'entra', label: 'Code + code_verifier' },
          { from: 'entra', to: 'app', label: 'ID token, access token', kind: 'return' },
          { from: 'app', to: 'api', label: 'Bearer access token' },
        ],
      },
    ],
    code: [
      {
        title: 'Client credentials, by hand, to see what a token is',
        language: 'bash',
        code: `curl -s -X POST "https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token" \\
  -d "client_id=<client-id>" \\
  -d "client_secret=<client-secret>" \\
  -d "scope=https://graph.microsoft.com/.default" \\
  -d "grant_type=client_credentials" | jq -r .access_token > token.jwt

# Inspect the claims: aud, iss, roles, appid, tid, exp
cut -d. -f2 token.jwt | tr '_-' '/+' | base64 -d 2>/dev/null | jq '{aud, iss, roles, appid, exp}'`,
        placeholders: ['<tenant-id>', '<client-id>', '<client-secret>'],
      },
    ],
    traps: [
      'Saying OAuth authenticates users. It authorises; OIDC authenticates.',
      'Recommending the implicit flow for a SPA.',
      'Using client credentials to act "as" a user.',
      'Validating an ID token and then sending it to an API as if it were an access token.',
    ],
    followUps: [
      'What is the difference between delegated and application permissions?',
      'What does the .default scope mean?',
      'Which claims must an API validate?',
    ],
    tags: ['oauth2', 'oidc', 'pkce', 'tokens', 'flows'],
  },
  {
    id: 'itv-azid-16',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What is workload identity federation, and how would you use it to let GitHub Actions or Azure Pipelines deploy to Azure without secrets?',
    probing:
      'The current best practice for CI/CD auth. They want the token exchange explained, the subject claim understood, and why it beats a client secret.',
    answer: [
      'Workload identity federation lets an Entra application or user-assigned managed identity **trust tokens issued by an external identity provider** - GitHub, Azure DevOps, a Kubernetes cluster, another cloud. You configure a **federated credential** that says: accept tokens from this **issuer**, with this exact **subject**, for this **audience**.',
      'At run time the pipeline asks its own platform for a short-lived **OIDC token**. GitHub issues one whose subject is something like `repo:contoso/shop:environment:production`. The Azure login step sends that token to Entra, Entra checks the issuer’s signature and the subject against the federated credential, and returns an Entra **access token** valid for about an hour.',
      'The win is that **no secret exists anywhere** - nothing to store in GitHub secrets, nothing to rotate, nothing to leak in logs. And the trust is **narrow**: only that repository, that branch or environment, can get the token. A fork or another repository presents a different subject and is rejected.',
      'For Azure DevOps it works the same way through a **service connection** using workload identity federation, with subject `sc://org/project/connection-name`. It is now the default type for new Azure Resource Manager service connections, and existing secret-based ones can be converted.',
    ],
    diagrams: [
      {
        kind: 'sequence',
        title: 'GitHub Actions to Azure with no secret',
        caption: 'Entra trusts the issuer and the exact subject - nothing long-lived is stored.',
        participants: [
          { id: 'job', label: 'Workflow job' },
          { id: 'gh', label: 'GitHub OIDC' },
          { id: 'entra', label: 'Entra ID' },
          { id: 'arm', label: 'Azure ARM' },
        ],
        messages: [
          { from: 'job', to: 'gh', label: 'Request OIDC token' },
          { from: 'gh', to: 'job', label: 'JWT, sub repo:org/app:env:prod', kind: 'return' },
          { from: 'job', to: 'entra', label: 'JWT: match issuer, subject, audience' },
          { from: 'entra', to: 'job', label: 'Access token, about 1 hour', kind: 'return' },
          { from: 'job', to: 'arm', label: 'Deploy with bearer token' },
        ],
      },
    ],
    code: [
      {
        title: 'Create the trust for a GitHub environment',
        language: 'bash',
        code: `APP_ID=$(az ad app create --display-name gh-shop-deploy --query appId -o tsv)
az ad sp create --id "$APP_ID"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "shop-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:contoso/shop:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'

az role assignment create --assignee "$APP_ID" --role Contributor \\
  --scope /subscriptions/<sub-id>/resourceGroups/rg-shop-prod`,
        placeholders: ['<sub-id>'],
      },
      {
        title: 'The workflow side',
        language: 'yaml',
        code: `permissions:
  id-token: write      # allow the job to request an OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production     # must match the federated credential subject
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: az deployment group create -g rg-shop-prod -f main.bicep`,
        explanation: 'The IDs are not secrets, so they can be plain repository variables.',
      },
    ],
    deeper: [
      'Use a **user-assigned managed identity** instead of an app registration as the federated principal where you can; it cannot have secrets added to it at all, which removes the temptation.',
      'Subjects are **exact matches**. Environment-based subjects are better than branch-based ones for production because GitHub environment protection rules then gate who can obtain the token. Flexible federated credentials with claim-matching expressions exist for broader patterns, but narrow is safer.',
      'The same mechanism underpins AKS workload identity: the cluster’s OIDC issuer signs service account tokens, and a federated credential trusts a specific namespace and service account.',
    ],
    traps: [
      'Forgetting `id-token: write`, so the job cannot request a token.',
      'A subject for `ref:refs/heads/main` when the job runs in an environment - the subject changes and the exchange fails.',
      'Giving the federated identity Owner on the subscription.',
    ],
    followUps: [
      'What exactly is in the subject claim for a pull request run?',
      'How would you convert an existing secret-based Azure DevOps service connection?',
    ],
    tags: ['workload identity federation', 'oidc', 'github actions', 'azure pipelines', 'ci/cd'],
  },
  {
    id: 'itv-azid-17',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Key Vault supports two permission models - access policies and Azure RBAC. Which do you use and why? What else do you configure on a production vault?',
    probing:
      'Security depth on the most sensitive resource. The escalation path through access policies is the senior insight.',
    answer: [
      'I use the **Azure RBAC permission model**, and it is Microsoft’s recommendation and the default for new vaults. With RBAC, data-plane access - reading secrets, using keys - is granted with roles like **Key Vault Secrets User**, **Key Vault Crypto User** or **Key Vault Secrets Officer**, at the vault scope or even on an **individual secret**. It is the same model, the same tooling and the same PIM integration as everything else in Azure.',
      '**Access policies** are the legacy model: a list on the vault saying which principal gets which secret, key and certificate permissions, vault-wide only. The serious problem is that access policies are a **control-plane property of the vault**, so anyone with **Contributor** on the vault can edit them and grant themselves every secret. With RBAC, granting data access needs role assignment write permission, which Contributor does not have.',
      'Beyond permissions, a production vault gets **soft delete** (always on now) with **purge protection** enabled, so a deleted vault or secret cannot be destroyed permanently during the retention period - vital against ransomware or a malicious insider. It gets **public network access disabled** with a **private endpoint**, **diagnostic settings** sending audit events to Log Analytics, and **one vault per application per environment**, so a compromised app cannot read another app’s secrets.',
      'And the best secret is one you do not need: where the target service supports Entra auth - Storage, SQL, Service Bus, Cosmos DB - I would use managed identity directly and keep Key Vault for the things that truly are secrets, like third-party API keys and certificates.',
    ],
    code: [
      {
        title: 'A production vault in Bicep',
        language: 'bicep',
        code: `resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-shop-prod-uks'
  location: location
  properties: {
    tenantId: tenant().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Disabled'
    networkAcls: { defaultAction: 'Deny', bypass: 'AzureServices' }
  }
}

resource audit 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  scope: kv
  name: 'to-law'
  properties: {
    workspaceId: logAnalyticsId
    logs: [ { categoryGroup: 'audit', enabled: true } ]
  }
}`,
      },
      {
        title: 'Who read which secret?',
        language: 'text',
        code: `AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName == "SecretGet"
| summarize reads = count() by identity_claim_oid_g, id_s, ResultSignature
| order by reads desc`,
        explanation:
          'With resource-specific tables enabled, query AZKVAuditLogs instead; the column names differ.',
      },
    ],
    deeper: [
      'Switching an existing vault from access policies to RBAC is instant and **drops all access policy grants**, so create the equivalent role assignments first and cut over in a maintenance window.',
      'Purge protection **cannot be turned off** once enabled, and it also blocks reusing the vault name until retention ends - worth knowing before enabling it in test environments that are torn down daily.',
      'Key Vault throttles per vault. Applications should cache secrets and refresh on a schedule or event, not call Key Vault on every request.',
    ],
    traps: [
      'Choosing access policies because they are "simpler", and leaving the Contributor escalation path open.',
      'One shared vault for every application.',
      'No purge protection on a production vault.',
      'Reading secrets from Key Vault on every request.',
    ],
    followUps: [
      'How do you migrate a vault from access policies to RBAC safely?',
      'How does an App Service reference a Key Vault secret without code changes?',
    ],
    tags: ['key vault', 'rbac', 'access policies', 'secrets', 'security'],
  },
  {
    id: 'itv-azid-18',
    level: 'intermediate',
    kind: 'mcq',
    prompt:
      'A GitHub Actions deploy job worked from the main branch. After adding `environment: production` to the job, azure/login fails with AADSTS700213 "No matching federated identity record found". What is the most likely cause?',
    options: [
      { id: 'a', text: 'The client secret stored in GitHub has expired' },
      {
        id: 'b',
        text: 'The token subject is now repo:org/repo:environment:production, which no federated credential matches',
      },
      { id: 'c', text: 'The service principal lost its Contributor role assignment' },
      { id: 'd', text: 'The id-token: write permission is not supported with environments' },
    ],
    correct: ['b'],
    probing:
      'Understanding that the subject claim changes with the job context and must match exactly.',
    answer: [
      'Adding an environment **changes the subject claim** GitHub puts in the OIDC token: from `repo:org/repo:ref:refs/heads/main` to `repo:org/repo:environment:production`. Federated credentials match the subject exactly, so the existing credential no longer matches. Add a federated credential for the environment subject - which is the better one for production anyway.',
      'There is no client secret in a federated setup, so it cannot have expired. A missing role assignment would fail **after** login with AuthorizationFailed, not during the token exchange. And `id-token: write` works fine with environments.',
    ],
    code: [
      {
        title: 'List and add federated credentials',
        language: 'bash',
        code: `az ad app federated-credential list --id <app-id> --query "[].{name:name, subject:subject}" -o table

az ad app federated-credential create --id <app-id> --parameters '{
  "name": "env-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:contoso/shop:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}'`,
        placeholders: ['<app-id>'],
      },
    ],
    traps: ['Assuming a login error is an RBAC problem.'],
    followUps: ['What subject does a pull_request-triggered run present?'],
    tags: ['workload identity federation', 'github actions', 'troubleshooting'],
  },
  {
    id: 'itv-azid-19',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Twelve product teams share an Azure estate. How would you design access so each team is self-sufficient, but nobody has more privilege than they need?',
    probing:
      'Putting RBAC, groups, PIM, managed identity and delegation together into a coherent model rather than listing features.',
    answer: [
      'I would build it around **scope and groups**. Each team gets its own subscriptions - or at least resource groups - per environment, and a small set of **Entra security groups**: readers, contributors, and privileged. Role assignments go only to those groups, deployed as code with the subscription, so access is reviewable in Git.',
      'Day to day, humans have **Reader in production** and **Contributor in non-production**. Production changes go through **pipelines** using workload identity federation, scoped to the team’s subscription. Humans who need production write access get it through **PIM** - eligible, time-bound, with justification - and the highest roles need approval.',
      'The awkward requirement is that teams’ Bicep often creates **role assignments** - granting their app’s managed identity access to their storage account. Instead of making the pipeline Owner, I give it **Role Based Access Control Administrator with a condition** that only allows assigning a short list of data roles, to service principals. That is delegation without escalation.',
      'Around that: workloads use **managed identities**, never shared secrets; custom roles fill specific gaps like VM operators; Azure Policy at the management group enforces the guardrails no role can bypass; and quarterly **access reviews** on the privileged groups catch drift.',
    ],
    code: [
      {
        title: 'Delegate role assignment, constrained to two data roles',
        language: 'bash',
        code: `# Storage Blob Data Reader and Key Vault Secrets User only
CONDITION="((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR (@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {2a2b9908-6ea1-4ae2-8e65-a410df84e7d1, 4633458b-17de-408a-b874-0445c86b69e6})) AND ((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR (@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {2a2b9908-6ea1-4ae2-8e65-a410df84e7d1, 4633458b-17de-408a-b874-0445c86b69e6}))"

az role assignment create \\
  --assignee <pipeline-sp-object-id> --assignee-principal-type ServicePrincipal \\
  --role "Role Based Access Control Administrator" \\
  --scope /subscriptions/<team-sub-id> \\
  --condition "$CONDITION" --condition-version 2.0`,
        placeholders: ['<pipeline-sp-object-id>', '<team-sub-id>'],
      },
      {
        title: 'Team access as code',
        language: 'bicep',
        code: `targetScope = 'subscription'

param readersGroupId string
param contributorsGroupId string

var reader = 'acdd72a7-3385-48ef-bd42-f606fba81ae7'
var contributor = 'b24988ac-6180-42a0-ab88-20f7382dd24c'

resource readers 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, readersGroupId, reader)
  properties: {
    principalId: readersGroupId
    principalType: 'Group'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', reader)
  }
}

resource contributors 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, contributorsGroupId, contributor)
  properties: {
    principalId: contributorsGroupId
    principalType: 'Group'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', contributor)
  }
}`,
      },
    ],
    deeper: [
      'There is a limit on role assignments per subscription. Assigning to groups rather than users is what keeps you comfortably below it in a large estate.',
      'Use **Azure Policy** for things RBAC cannot express: a Contributor can create a public storage account, but a deny policy can stop anyone from doing so.',
    ],
    traps: [
      'Giving pipelines Owner because Bicep creates role assignments.',
      'Standing production Contributor for every engineer.',
      'Role assignments to individual users, created by hand in the portal.',
    ],
    followUps: [
      'How would you audit who has Owner anywhere in the estate?',
      'What can Azure Policy do that RBAC cannot?',
    ],
    tags: ['rbac', 'least privilege', 'pim', 'abac', 'design'],
  },
  {
    id: 'itv-azid-20',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Production is down. The app logs show AADSTS7000222: the client secret for its app registration has expired. Fix it now, then tell me how you make sure this never happens again.',
    probing:
      'Calm incident handling, then the structural fix - removing the secret entirely - and proactive detection across the tenant.',
    answer: [
      'Right now: **add a new secret alongside** the expired one - never replace in place during an outage - put it where the app reads it, ideally a Key Vault secret the app references, and restart or refresh the app. If the app reads the secret from Key Vault via a reference, updating the vault version and restarting is enough. I confirm recovery in the logs, then remove the expired credential.',
      'The real fix is to **stop using a client secret**. If the app runs in Azure, switch to a **managed identity**. If it runs elsewhere - another cloud, Kubernetes, a CI system - use **workload identity federation**. If neither is possible, use a **certificate** stored in Key Vault with auto-renewal instead of a secret. Each of those removes the expiry-driven outage.',
      'For everything that still has credentials, I would add **detection**: a scheduled job that queries Microsoft Graph for app registrations with secrets or certificates expiring in the next 30 days and alerts the owning team. Entra also exposes app credential expiry in its recommendations, and you can enforce **app management policies** that limit secret lifetime or block new password credentials entirely.',
      'And in the post-incident review, I would ask why the owner did not know - usually because the app has no listed owner, which is its own governance action.',
    ],
    code: [
      {
        title: 'Recover: append a new secret, keep the old until cut-over',
        language: 'bash',
        code: `# --append keeps existing credentials; --years 1 shortens exposure
az ad app credential reset --id <app-id> --append --display-name "2026-09 rotation" --years 1 \\
  --query password -o tsv | az keyvault secret set --vault-name kv-shop-prod \\
  --name shop-api-client-secret --file /dev/stdin -o none

az webapp restart -g rg-shop-prod -n app-shop-prod`,
        placeholders: ['<app-id>'],
      },
      {
        title: 'Find credentials expiring in the next 30 days',
        language: 'powershell',
        code: `Connect-MgGraph -Scopes Application.Read.All
$limit = (Get-Date).AddDays(30)

Get-MgApplication -All -Property DisplayName,AppId,PasswordCredentials,KeyCredentials |
  ForEach-Object {
    $app = $_
    @($app.PasswordCredentials) + @($app.KeyCredentials) |
      Where-Object { $_.EndDateTime -and $_.EndDateTime -lt $limit } |
      ForEach-Object {
        [pscustomobject]@{
          App     = $app.DisplayName
          AppId   = $app.AppId
          Expires = $_.EndDateTime
        }
      }
  } | Sort-Object Expires | Format-Table`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Replacing a client secret for good',
        caption: 'The only secret that cannot expire in production is one that does not exist.',
        question: 'Where does the workload run?',
        branches: [
          {
            condition: 'In Azure (App Service, VM, AKS, Functions)',
            result: 'Managed identity',
            tone: 'success',
          },
          {
            condition: 'GitHub, Azure DevOps, Kubernetes, other clouds',
            result: 'Workload identity federation',
            tone: 'accent',
          },
          {
            condition: 'On-premises, no OIDC issuer',
            result: 'Certificate from Key Vault',
            detail: 'Auto-renewal and alerting',
            tone: 'warning',
          },
        ],
      },
    ],
    deeper: [
      'Replacing the secret in place instead of appending means every instance of the app fails until it picks up the new value. Append, roll out, then remove the old one.',
      'Application management policies can set a tenant-wide maximum lifetime for new secrets, or block password credentials for new apps, pushing teams toward certificates and federation.',
    ],
    traps: [
      'Creating a secret that never expires.',
      'Rotating in place and breaking every other consumer of that secret.',
      'Fixing this one app and not scanning for the next one.',
    ],
    followUps: [
      'How would you rotate a secret used by several applications with zero downtime?',
      'How do Key Vault references in App Service pick up a new secret version?',
    ],
    tags: ['scenario', 'secrets', 'app registration', 'incident', 'managed identity'],
  },
]
