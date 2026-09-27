import type { InterviewQuestion } from '../../../types'

/** Entra ID itself: tenants, users and groups, app registrations and managed identities. */
export const azureIdentityEntraQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azid-1',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a Microsoft Entra ID tenant, and how does it relate to Azure subscriptions?',
    probing:
      'The foundation of every identity question. They want the trust relationship described correctly - one tenant per subscription, many subscriptions per tenant.',
    answer: [
      'A **tenant** is a dedicated instance of Microsoft Entra ID for one organisation. It holds the directory - users, groups, app registrations, service principals, devices - and it is the thing that authenticates people and workloads and issues tokens. It has a GUID tenant ID and at least one domain, such as `contoso.onmicrosoft.com`.',
      'An **Azure subscription trusts exactly one tenant**. When you sign in to manage a subscription, that tenant authenticates you and Azure RBAC in the subscription decides what you can do. A tenant can have many subscriptions trusting it; a subscription cannot trust two tenants at once.',
      'That separation matters. Identity - who you are - lives in the tenant. Authorisation for Azure resources - what you can do - lives in role assignments on subscriptions, resource groups and resources. Microsoft 365 uses the same tenant, which is why the same account signs in to Teams and to the Azure portal.',
      'You can move a subscription to a different tenant, but it is disruptive: every Azure role assignment is removed, and managed identities and Key Vault access tied to the old tenant break.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'One tenant, many subscriptions',
        caption:
          'The tenant says who you are; role assignments in each subscription say what you can do.',
        root: {
          label: 'Entra ID tenant: contoso',
          detail: 'Users, groups, apps, service principals',
          tone: 'accent',
          children: [
            { label: 'Subscription: prod', detail: 'Trusts this tenant only' },
            { label: 'Subscription: nonprod', detail: 'Own role assignments' },
            { label: 'Microsoft 365', detail: 'Same identities', tone: 'muted' },
          ],
        },
      },
    ],
    code: [
      {
        title: 'Which tenant am I in, and which subscriptions trust it?',
        language: 'bash',
        code: `az account show --query "{tenant:tenantId, user:user.name, sub:name}" -o table
az account tenant list -o table                    # tenants you can sign in to
az account list --query "[].{name:name, id:id, tenant:tenantId}" -o table

# Sign in to a specific tenant, e.g. as a guest in a customer tenant
az login --tenant <tenant-id>`,
        placeholders: ['<tenant-id>'],
      },
    ],
    traps: [
      'Calling it Azure AD in 2026. The product is Microsoft Entra ID.',
      'Saying a subscription can belong to several tenants.',
      'Believing Entra directory roles give access to Azure resources. They are a separate system.',
    ],
    followUps: [
      'What breaks when you transfer a subscription to another tenant?',
      'Why might a company run more than one tenant?',
    ],
    tags: ['entra id', 'tenant', 'subscriptions', 'fundamentals'],
  },
  {
    id: 'itv-azid-2',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do you manage users and groups in Entra ID at scale? Explain assigned versus dynamic groups and security versus Microsoft 365 groups.',
    probing:
      'Practical administration: granting access to groups rather than individuals, and knowing when dynamic membership helps.',
    answer: [
      'The rule I work by is **grant access to groups, never to individual users**. People join, move and leave; if access is attached to groups, onboarding and offboarding become one membership change instead of a hunt through role assignments.',
      '**Security groups** are for access - Azure RBAC, app assignments, Conditional Access targeting, licensing. **Microsoft 365 groups** come with a mailbox, a SharePoint site and a Team, and are for collaboration. For infrastructure access I use security groups.',
      'Membership is either **assigned** - someone adds members - or **dynamic**, where a rule on user attributes decides membership automatically, for example everyone whose `department` is Engineering. Dynamic groups need an Entra ID P1 licence, and they are only as good as the HR data feeding the attributes.',
      'At scale, users are usually **synchronised from on-premises Active Directory** with Entra Connect or Cloud Sync, or provisioned from an HR system, so the source of truth is outside Entra and changes flow in automatically.',
    ],
    code: [
      {
        title: 'A security group and an RBAC assignment to it',
        language: 'bash',
        code: `GROUP_ID=$(az ad group create --display-name "sg-shop-prod-readers" \\
  --mail-nickname sg-shop-prod-readers --query id -o tsv)

az ad group member add --group sg-shop-prod-readers --member-id <user-object-id>

az role assignment create --assignee-object-id "$GROUP_ID" \\
  --assignee-principal-type Group --role Reader \\
  --scope /subscriptions/<sub-id>/resourceGroups/rg-shop-prod`,
        placeholders: ['<user-object-id>', '<sub-id>'],
      },
      {
        title: 'A dynamic membership rule',
        language: 'text',
        code: `(user.department -eq "Engineering") and (user.accountEnabled -eq true) and (user.userType -eq "Member")`,
        explanation:
          'Excluding guests and disabled accounts keeps the group from silently growing.',
      },
    ],
    traps: [
      'Assigning roles directly to users.',
      'Using a dynamic group for privileged access, where anyone who can edit a user attribute can grant themselves membership.',
    ],
    followUps: [
      'What are role-assignable groups, and why are they special?',
      'How do guest users appear in the directory?',
    ],
    tags: ['entra id', 'groups', 'users', 'dynamic groups'],
  },
  {
    id: 'itv-azid-3',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between an app registration, an enterprise application and a service principal?',
    probing:
      'A classic confusion. They want the object model - one application object, a service principal per tenant - and why it matters for multi-tenant apps and permissions.',
    answer: [
      'An **app registration** creates an **application object** in its home tenant. It is the global definition of the app: its client ID, redirect URIs, the permissions it asks for, the roles it exposes, and its credentials - secrets, certificates or federated credentials.',
      'A **service principal** is the app’s **local identity inside a particular tenant**. It is what gets role assignments, consented permissions and sign-in logs. When you register an app in your own tenant, a service principal is created there too. When a multi-tenant app is used by another organisation, a service principal is created in **their** tenant, pointing back at the one application object.',
      'The **Enterprise applications** blade in the portal is simply the list of **service principals** in your tenant - your own apps, gallery SaaS apps, Microsoft first-party apps. So "enterprise app" and "service principal" are the same object seen from different angles.',
      'Practically: you manage **credentials and requested permissions** on the app registration, and you manage **who can sign in, admin consent, and Azure RBAC** on the service principal. When someone says "give the app Contributor", the role assignment is on the service principal’s object ID - not the application’s object ID, which is a common mistake.',
    ],
    diagrams: [
      {
        kind: 'nested',
        title: 'One application, a service principal per tenant',
        caption:
          'Credentials live on the app registration; roles and consent live on the service principal.',
        root: {
          label: 'Home tenant (contoso)',
          children: [
            {
              label: 'Application object',
              detail: 'Client ID, credentials, requested permissions',
              tone: 'accent',
            },
            {
              label: 'Service principal (contoso)',
              detail: 'Role assignments, consent, sign-in logs',
            },
            {
              label: 'Customer tenant (fabrikam)',
              tone: 'muted',
              children: [
                {
                  label: 'Service principal (fabrikam)',
                  detail: 'Created on first consent',
                },
              ],
            },
          ],
        },
      },
    ],
    code: [
      {
        title: 'Three different IDs for one app',
        language: 'bash',
        code: `APP_ID=$(az ad app create --display-name app-shop-api --query appId -o tsv)   # client ID
az ad sp create --id "$APP_ID"                                               # service principal

az ad app show --id "$APP_ID" --query "{clientId:appId, appObjectId:id}"
az ad sp show  --id "$APP_ID" --query "{clientId:appId, spObjectId:id}"

# Role assignments must target the SERVICE PRINCIPAL object ID
SP_OID=$(az ad sp show --id "$APP_ID" --query id -o tsv)
az role assignment create --assignee-object-id "$SP_OID" \\
  --assignee-principal-type ServicePrincipal --role Reader --scope /subscriptions/<sub-id>`,
        placeholders: ['<sub-id>'],
      },
    ],
    traps: [
      'Using the application object ID for a role assignment.',
      'Deleting the enterprise application and expecting the app registration to go too, or the reverse.',
      'Thinking a managed identity has an app registration. It has only a service principal.',
    ],
    followUps: [
      'What happens in a customer tenant when they consent to your multi-tenant app?',
      'Where do you see sign-in logs for a service principal?',
    ],
    tags: ['app registration', 'service principal', 'enterprise applications', 'entra id'],
  },
  {
    id: 'itv-azid-4',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain managed identities. When would you choose system-assigned versus user-assigned?',
    probing:
      'The default answer to "how does the app authenticate". They want lifecycle differences and real reasons to pick one.',
    answer: [
      'A **managed identity** is a service principal whose credentials Azure creates, stores and rotates for you. The code asks the local endpoint on the host - the instance metadata service on a VM, or an equivalent on App Service, Functions, Container Apps and AKS workload identity - for a token, and uses it against Key Vault, Storage, SQL or any Entra-protected API. **No secret ever exists in your configuration.**',
      'A **system-assigned** identity is tied to one resource. It is created with the resource and **deleted with it**, and it cannot be shared. It is the simplest choice when one resource needs its own identity, and the lifecycle cleanup is automatic.',
      'A **user-assigned** identity is a standalone resource you create and then attach to one or more resources. Its lifecycle is independent. I choose it when several resources should share one identity - all instances of a scale set, or blue and green slots; when the **role assignments must exist before the resource is created**, which avoids a chicken-and-egg problem in IaC and propagation delays; or when resources are frequently recreated and you do not want to redo role assignments each time.',
      'Both need **Azure RBAC role assignments** on the target to do anything. A managed identity with no role assignments can authenticate but is authorised for nothing.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'System-assigned or user-assigned?',
        caption: 'Default to system-assigned; switch when lifecycle or sharing demands it.',
        question: 'What must the identity outlive or be shared by?',
        branches: [
          {
            condition: 'One resource, same lifecycle',
            result: 'System-assigned',
            detail: 'Deleted with the resource',
            tone: 'success',
          },
          {
            condition: 'Many resources share access',
            result: 'User-assigned',
            detail: 'One set of role assignments',
            tone: 'accent',
          },
          {
            condition: 'Roles must exist before deploy',
            result: 'User-assigned',
            detail: 'Pre-create and grant in IaC',
            tone: 'accent',
          },
          {
            condition: 'Resource recreated often',
            result: 'User-assigned',
            detail: 'Access survives recreation',
          },
        ],
      },
    ],
    code: [
      {
        title: 'User-assigned identity with a Key Vault role, in Bicep',
        language: 'bicep',
        code: `resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-shop-api'
  location: location
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Key Vault Secrets User
var secretsUser = '4633458b-17de-408a-b874-0445c86b69e6'

resource grant 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: kv
  name: guid(kv.id, uami.id, secretsUser)
  properties: {
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsUser)
  }
}`,
        explanation:
          'Setting principalType avoids a failure when Entra replication has not caught up with the brand-new identity.',
      },
      {
        title: 'What the code does under the hood on a VM',
        language: 'bash',
        code: `curl -s -H Metadata:true \\
  "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://vault.azure.net" \\
  | jq -r .access_token | cut -c1-40

# In application code, just use DefaultAzureCredential / ManagedIdentityCredential
# and pass the client ID when a resource has more than one user-assigned identity.`,
      },
    ],
    traps: [
      'Assuming a managed identity has permissions just by existing.',
      'Attaching two user-assigned identities and not telling the SDK which client ID to use.',
      'Expecting a managed identity to work from a developer laptop. It exists only on Azure hosts.',
    ],
    followUps: [
      'How does DefaultAzureCredential pick a credential locally versus in Azure?',
      'Why can a role assignment on a just-created identity fail?',
    ],
    tags: ['managed identity', 'entra id', 'key vault', 'bicep'],
  },
  {
    id: 'itv-azid-5',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'An application on an Azure VM needs to read secrets from Key Vault. Security says no secrets may be stored on the VM or in configuration. What do you use?',
    options: [
      {
        id: 'a',
        text: 'A service principal with a client secret stored in an environment variable',
      },
      {
        id: 'b',
        text: 'The VM’s managed identity, granted Key Vault Secrets User on the vault',
      },
      { id: 'c', text: 'A Key Vault access key embedded in the application settings file' },
      { id: 'd', text: 'A shared access signature for the vault, rotated monthly' },
    ],
    correct: ['b'],
    probing: 'Whether managed identity is your reflex for Azure-hosted workloads.',
    answer: [
      'A **managed identity** on the VM, granted the **Key Vault Secrets User** role on the vault. The VM gets tokens from the local metadata endpoint, and no credential is ever stored anywhere you manage.',
      'A client secret in an environment variable is exactly the stored secret the requirement forbids. Key Vault has no "access key", and SAS tokens belong to Storage, not Key Vault - both options sound plausible but do not exist for this service.',
    ],
    code: [
      {
        title: 'Enable the identity and grant it',
        language: 'bash',
        code: `PRINCIPAL=$(az vm identity assign -g rg-app -n vm-app-01 --query systemAssignedIdentity -o tsv)
KV_ID=$(az keyvault show -n kv-shop-prod --query id -o tsv)

az role assignment create --assignee-object-id "$PRINCIPAL" \\
  --assignee-principal-type ServicePrincipal \\
  --role "Key Vault Secrets User" --scope "$KV_ID"`,
      },
    ],
    traps: ['Reaching for a service principal secret when the workload runs in Azure.'],
    followUps: ['What would you do if the same code must also run on-premises?'],
    tags: ['managed identity', 'key vault', 'basics'],
  },
]
