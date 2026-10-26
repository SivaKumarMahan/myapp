import type { InterviewQuestion } from '../../../types'

/** Inmar round: Entra ID, managed identities, RBAC and federated credentials. */
export const roundsInmarIdentityQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rinm-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Entra ID and enterprise applications in Azure?',
    probing:
      'Whether you can separate Entra ID roles from Azure RBAC, and explain app registration versus enterprise application with real examples.',
    answer: [
      "**Microsoft Entra ID:** **Microsoft Entra ID** (formerly **Azure Active Directory**) is Microsoft's cloud **identity service**. It answers two questions for everything in Azure and Microsoft 365:\n- **Authentication:** who are you? (sign-in, MFA)\n- **Authorization:** what are you allowed to access? (tokens, roles, consent)",
      'It stores and manages:\n- **Object**: Users; **Example**: `john@company.com`\n- **Object**: Groups; **Example**: `aks-admins`, `devops-team`\n- **Object**: Applications (app registrations); **Example**: Our web app that lets users sign in with company accounts\n- **Object**: Service principals / enterprise applications; **Example**: The identity an app or pipeline uses in our tenant\n- **Object**: Managed identities; **Example**: The identity of an AKS workload or App Service',
      'Common features: **SSO**, **MFA**, **Conditional Access** (for example, block sign-in from outside allowed countries), **Privileged Identity Management** (just-in-time admin access).',
      '**Entra ID roles vs Azure RBAC roles:** Entra ID roles (Global Administrator, User Administrator) manage the **directory**. Azure RBAC roles (Owner, Contributor, Reader) manage **Azure resources**. These are different systems.',
      "**App registration vs enterprise application:** This is the confusing part, so explain it with two objects:\n- **What it is** — **App registration**: The **application object**: the global definition of the app; **Enterprise application**: The **service principal**: the app's instance in a specific tenant\n- **Where it lives** — **App registration**: Only in the tenant where the app was created; **Enterprise application**: In every tenant that uses the app\n- **What you configure** — **App registration**: Redirect URIs, secrets/certificates, federated credentials, API permissions it requests; **Enterprise application**: Who can use it (user assignment), SSO settings, admin consent, Conditional Access, sign-in logs\n- **Analogy** — **App registration**: The **class**; **Enterprise application**: The **object/instance**",
      'When you create an app registration in the portal, Azure **automatically creates the matching enterprise application** (service principal) in your tenant.',
      '**Real examples**\n1. **Our own app:** we create an app registration for a Spring Boot app so users sign in with Entra ID (OAuth2/OpenID Connect). In the enterprise application, we turn on "Assignment required" and assign only the `sales-team` group.\n2. **A SaaS app (Jira, ServiceNow, Salesforce):** we add it from the **Enterprise applications gallery** and configure SAML SSO. There is no app registration in our tenant, because the vendor owns the app.\n3. **Azure DevOps service connection:** it creates an app registration, and its service principal (enterprise application) gets RBAC roles on the subscription.\n4. **Managed identities** also appear under Enterprise applications (filter by "Managed Identities"), but you manage them from the managed identity resource.',
      '**Interview answer:** "Entra ID is Azure\'s identity service for users, groups, and applications, handling sign-in, MFA, Conditional Access, and tokens. An app registration is the global definition of an application, where we configure redirect URIs, credentials, and API permissions. An enterprise application is its service principal in our tenant, where we control who can use it, configure SSO, grant consent, and check sign-in logs. For example, for SaaS apps like ServiceNow, we add an enterprise application from the gallery for SSO, and for our own apps or pipelines, we create an app registration and assign roles to its service principal."',
    ],
    tags: ['azure', 'entra id', 'enterprise applications', 'app registration', 'identity'],
  },
  {
    id: 'itv-rinm-29',
    level: 'intermediate',
    kind: 'open',
    prompt: 'User-assigned vs system-assigned managed identity?',
    probing:
      'The lifecycle and sharing differences between the two managed identity types, and why user-assigned fits AKS and pipelines.',
    answer: [
      'A **managed identity** gives an Azure resource its own identity in Entra ID, so it can access other Azure services (Key Vault, Storage, SQL) **without any passwords or secrets in code**. Azure creates and rotates the credentials.',
      '- **Created how** — **System-assigned**: Enabled **on** a resource (a switch on the VM or App Service); **User-assigned**: Created as a **separate Azure resource**\n- **Lifecycle** — **System-assigned**: Tied to the resource. Delete the VM → identity is deleted; **User-assigned**: Independent. Survives when resources are deleted\n- **Shared?** — **System-assigned**: No, one resource only; **User-assigned**: Yes, can be attached to **many** resources\n- **Role assignments** — **System-assigned**: Must be redone if the resource is recreated; **User-assigned**: Stay the same when resources are recreated\n- **Best for** — **System-assigned**: A single resource with its own access needs; **User-assigned**: Many resources needing the same access, AKS Workload ID, resources recreated often',
      '**Example: system-assigned (one App Service reads from Key Vault)**',
      'If the App Service is deleted, the identity and its access are removed automatically, so nothing is left over.',
      '**Example: user-assigned (10 VMs in a scale set read from the same Storage account)**',
      'The role is assigned **once** to `id-batch-workers`. When the scale set is rebuilt, or another VM needs the same access, just attach the same identity.',
      '**Why user-assigned is common in AKS and pipelines**\n- **AKS Workload ID** requires a user-assigned identity with a federated credential (see the EPAM rounds topic (part 3, Q9)).\n- With Terraform or Bicep, you can create the identity and its role assignments **before** the resource exists, which avoids "identity not ready yet" ordering problems.',
      '**Interview answer:** "A system-assigned identity is enabled on one resource and shares its lifecycle, so if I delete the App Service, its identity is deleted too. I use it when one resource needs its own access, like an App Service reading Key Vault. A user-assigned identity is a separate resource that can be attached to many resources and survives when they\'re deleted, so the role assignments stay. I use it for AKS Workload ID, for scale sets or multiple apps that need the same access, and when resources are recreated often by Terraform."',
    ],
    code: [
      {
        title: 'System-assigned identity for App Service',
        language: 'bash',
        code: `az webapp identity assign -g rg-app-dev -n app-orders-dev

PRINCIPAL_ID=$(az webapp identity show -g rg-app-dev -n app-orders-dev \\
  --query principalId -o tsv)

az role assignment create \\
  --assignee-object-id "$PRINCIPAL_ID" \\
  --assignee-principal-type ServicePrincipal \\
  --role "Key Vault Secrets User" \\
  --scope "$(az keyvault show -n kv-orders-dev --query id -o tsv)"`,
      },
      {
        title: 'User-assigned identity shared by a scale set',
        language: 'bash',
        code: `az identity create -g rg-app-dev -n id-batch-workers

az vmss identity assign -g rg-app-dev -n vmss-batch \\
  --identities id-batch-workers`,
      },
    ],
    tags: ['azure', 'managed identity', 'identity', 'rbac'],
  },
  {
    id: 'itv-rinm-30',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you create a custom role in Azure?',
    probing:
      'That you can build a least-privilege role definition, create it, assign it at the right scope to a group, and do the same in Terraform.',
    answer: [
      'Create a **custom role** when no built-in role matches the access you need. Built-in roles are often too broad (Contributor) or too narrow (Reader).',
      '**Scenario:** the support team should be able to **start, stop, and restart VMs** and view them, but **not create, delete, or resize** them.',
      '**Step 2: Write the role definition (`vm-operator-role.json`)**',
      '- **Field**: `Actions`; **Meaning**: Allowed **management** operations (control plane)\n- **Field**: `NotActions`; **Meaning**: Operations removed from `Actions` (subtraction, not an explicit deny)\n- **Field**: `DataActions`; **Meaning**: Allowed operations on **data**, such as reading blobs or Key Vault secrets\n- **Field**: `AssignableScopes`; **Meaning**: Where the role can be assigned (management group, subscription, or resource group)',
      '**Portal way:** Subscription → **Access control (IAM)** → **Add** → **Add custom role** → start from scratch or **clone a built-in role** (for example, clone Virtual Machine Contributor and remove permissions) → add permissions → set assignable scopes → **Review + create**.',
      '**Good practices**\n- Start from the **least privilege**; avoid wildcards like `Microsoft.Compute/*`.\n- Assign to **groups**, at the **smallest scope** needed.\n- Keep role definitions in code (Terraform/Bicep) so changes are reviewed.\n- Test with a test user before rolling out.',
      '**Interview answer:** "When no built-in role fits, I create a custom role. For example, for a support team that should only start, stop, and restart VMs, I list the exact actions with `az provider operation show`, write a JSON definition with the Actions, any DataActions, and the assignable scopes, and create it with `az role definition create`. Then I assign it to the support group at the resource-group scope. In real projects, I keep custom roles in Terraform so changes go through review, and I follow least privilege with no broad wildcards."',
    ],
    code: [
      {
        title: 'Step 1: find the right actions',
        language: 'bash',
        code: `az provider operation show --namespace Microsoft.Compute \\
  --query "resourceTypes[?name=='virtualMachines'].operations[].name" -o tsv`,
      },
      {
        title: 'Step 2: role definition (vm-operator-role.json)',
        language: 'json',
        code: `{
  "Name": "VM Operator (Custom)",
  "IsCustom": true,
  "Description": "Can view, start, stop, and restart virtual machines.",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/powerOff/action",
    "Microsoft.Compute/virtualMachines/deallocate/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Compute/virtualMachines/instanceView/read",
    "Microsoft.Resources/subscriptions/resourceGroups/read"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/subscriptions/<subscription-id>"
  ]
}`,
      },
      {
        title: 'Step 3: create the role',
        language: 'bash',
        code: `az role definition create --role-definition @vm-operator-role.json`,
      },
      {
        title: 'Step 4: assign it to a group, not individual users',
        language: 'bash',
        code: `az role assignment create \\
  --assignee-object-id "<support-team-group-object-id>" \\
  --assignee-principal-type Group \\
  --role "VM Operator (Custom)" \\
  --scope "/subscriptions/<subscription-id>/resourceGroups/rg-app-prod"`,
      },
      {
        title: 'Custom role with Terraform',
        language: 'hcl',
        code: `resource "azurerm_role_definition" "vm_operator" {
  name        = "VM Operator (Custom)"
  scope       = data.azurerm_subscription.current.id
  description = "Can view, start, stop, and restart virtual machines."

  permissions {
    actions = [
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/powerOff/action",
      "Microsoft.Compute/virtualMachines/deallocate/action",
      "Microsoft.Compute/virtualMachines/restart/action",
      "Microsoft.Compute/virtualMachines/instanceView/read",
      "Microsoft.Resources/subscriptions/resourceGroups/read",
    ]
    not_actions = []
  }

  assignable_scopes = [data.azurerm_subscription.current.id]
}

resource "azurerm_role_assignment" "support_vm_operator" {
  scope              = azurerm_resource_group.prod.id
  role_definition_id = azurerm_role_definition.vm_operator.role_definition_resource_id
  principal_id       = var.support_group_object_id
}`,
      },
    ],
    tags: ['azure', 'rbac', 'custom role', 'terraform'],
  },
  {
    id: 'itv-rinm-31',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you create a service connection manually and via Bicep code in Azure?',
    probing:
      'Whether you can create a workload identity federation service connection by hand and in code, and know which parts live in Azure DevOps and which in Azure.',
    answer: [
      'First, clarify one important point: an **Azure DevOps service connection is an Azure DevOps object, not an Azure resource**. Bicep deploys only Azure resources through ARM, so **Bicep cannot create the service connection itself**.',
      'What we automate:\n- **Bicep:** the **Azure side**: managed identity, federated credential, and role assignments.\n- **Azure DevOps CLI / REST API / Terraform `azuredevops` provider:** the **service connection** itself.',
      '**Method 1: Manually in Azure DevOps (workload identity federation):** **Automatic option (quickest, needs high permissions):**',
      '1. Azure DevOps → **Project settings** → **Service connections** → **New service connection**.\n2. Choose **Azure Resource Manager**.\n3. Identity type: **App registration (automatic)**, credential: **Workload identity federation**.\n4. Scope: **Subscription** → choose the subscription and, optionally, a **resource group** to limit access.\n5. Name it, for example `sc-azure-dev`.\n6. **Do not** tick "Grant access permission to all pipelines". Authorize pipelines individually.\n7. Save. Azure DevOps creates the app registration, federated credential, and role assignment for you.',
      "**Manual option (when you're not allowed to create app registrations, or want to use your own managed identity):**",
      '1. Create a **user-assigned managed identity** (or app registration) in Azure.\n2. In Azure DevOps, create the service connection with identity type **App registration or managed identity (manual)** and credential **Workload identity federation**.\n3. Azure DevOps shows an **Issuer** and a **Subject identifier**. Copy them exactly.\n4. In Azure, on the managed identity → **Federated credentials** → **Add** → "Other issuer" → paste the issuer and subject.\n5. Give the identity an RBAC role (for example **Contributor** on the target resource group).\n6. Back in Azure DevOps, enter the client ID, tenant ID, and subscription, then **Verify and save**.',
      'Then add **Approvals and checks** on the service connection for production.',
      '**Method 2: Azure side with Bicep**',
      'Then create the service connection with the `clientId` output (manually, with `az devops service-endpoint create`, or with the REST API).',
      '**Method 3: Fully in code with Terraform:** The `azuredevops` provider can create the service connection, and `azurerm` creates the identity and federated credential in the same run:',
      '**Interview answer:** "Manually, I go to Project settings, Service connections, and create an Azure Resource Manager connection with workload identity federation, scoped to the subscription or resource group, without granting access to all pipelines. If I\'m using my own managed identity, I copy the issuer and subject from Azure DevOps into a federated credential on the identity and assign it an RBAC role. A service connection is an Azure DevOps object, not an Azure resource, so Bicep can\'t create it directly. With Bicep, I create the managed identity, federated credential, and role assignment, and then create the connection with the Azure DevOps CLI or REST API. If we want everything in code, the Terraform `azuredevops` provider can create the service connection too."',
    ],
    code: [
      {
        title: 'Managed identity with federated credential (Bicep)',
        language: 'bicep',
        code: `param location string = resourceGroup().location
param adoIssuer string    // copied from the service connection
param adoSubject string   // copied from the service connection

resource deployIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-ado-deploy-dev'
  location: location
}

resource adoFederation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: deployIdentity
  name: 'ado-sc-azure-dev'
  properties: {
    issuer: adoIssuer
    subject: adoSubject
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

// Contributor on this resource group
resource contributorAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, deployIdentity.id, 'contributor')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c')
    principalId: deployIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output clientId string = deployIdentity.properties.clientId`,
      },
      {
        title: 'Deploy the Bicep file',
        language: 'bash',
        code: `az deployment group create -g rg-app-dev \\
  --template-file ado-identity.bicep \\
  --parameters adoIssuer="<issuer>" adoSubject="<subject>"`,
      },
      {
        title: 'Service connection fully in Terraform',
        language: 'hcl',
        code: `resource "azurerm_user_assigned_identity" "ado" {
  name                = "id-ado-deploy-dev"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

resource "azuredevops_serviceendpoint_azurerm" "dev" {
  project_id                             = data.azuredevops_project.app.id
  service_endpoint_name                  = "sc-azure-dev"
  service_endpoint_authentication_scheme = "WorkloadIdentityFederation"

  credentials {
    serviceprincipalid = azurerm_user_assigned_identity.ado.client_id
  }

  azurerm_spn_tenantid      = data.azurerm_client_config.current.tenant_id
  azurerm_subscription_id   = data.azurerm_client_config.current.subscription_id
  azurerm_subscription_name = "sub-app-dev"
}

resource "azurerm_federated_identity_credential" "ado" {
  name                = "ado-sc-azure-dev"
  resource_group_name = azurerm_resource_group.rg.name
  parent_id           = azurerm_user_assigned_identity.ado.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azuredevops_serviceendpoint_azurerm.dev.workload_identity_federation_issuer
  subject             = azuredevops_serviceendpoint_azurerm.dev.workload_identity_federation_subject
}

resource "azurerm_role_assignment" "ado_contributor" {
  scope                = azurerm_resource_group.rg.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.ado.principal_id
}`,
      },
    ],
    followUps: [
      'Why is workload identity federation preferred over a service principal with a client secret?',
      'Where do you find the issuer and subject values for an Azure DevOps service connection?',
      'How do you limit which pipelines can use a production service connection?',
    ],
    tags: [
      'azure devops',
      'service connection',
      'bicep',
      'terraform',
      'workload identity federation',
    ],
  },
  {
    id: 'itv-rinm-32',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you create federated credentials, and how do you use them?',
    probing:
      'That you understand OIDC token exchange, the issuer, subject and audience values, how to set it up for GitHub Actions, and how to fix subject mismatch errors.',
    answer: [
      'A **federated credential** tells Entra ID: *"Trust tokens from this external identity provider, but only for this exact subject."* The external system (Azure DevOps, GitHub Actions, AKS, GitLab) presents its own short-lived token, and Entra ID exchanges it for an Azure access token. **No client secret or certificate is stored anywhere.**',
      'A federated credential has three key fields:\n- **Field**: **Issuer**; **Meaning**: Who issues the external token; **Example**: `https://token.actions.githubusercontent.com`\n- **Field**: **Subject**; **Meaning**: Which exact workload is trusted; **Example**: `repo:myorg/orders-api:environment:prod`\n- **Field**: **Audience**; **Meaning**: Who the token is for; **Example**: `api://AzureADTokenExchange`',
      'It can be added to an **app registration** or a **user-assigned managed identity** (up to 20 per identity).',
      '**Example: GitHub Actions deploying to Azure:** **Step 1: Create the identity and federated credential**',
      '**Step 2: Give it RBAC access**',
      '**Step 3: Use it in the workflow**',
      'The client ID, tenant ID, and subscription ID are **not secrets**. There is no password anywhere.',
      '**Where else we use federated credentials**\n- **Use case**: Azure DevOps service connection; **Issuer**: Shown in the service connection (Q31); **Subject**: Shown in the service connection\n- **Use case**: AKS Workload ID; **Issuer**: AKS OIDC issuer URL; **Subject**: `system:serviceaccount:<namespace>:<service-account>` (the EPAM rounds topic (part 3, Q9))\n- **Use case**: GitLab CI; **Issuer**: `https://gitlab.com`; **Subject**: `project_path:mygroup/myproject:ref_type:branch:ref:main`',
      "**Common errors**\n- **Error**: `AADSTS70021: No matching federated identity record found`; **Cause**: The subject doesn't match exactly (wrong branch, environment, repo name, or case)\n- **Error**: `AADSTS700213` / audience errors; **Cause**: Audience is not `api://AzureADTokenExchange`\n- **Error**: Login works, but deployment gets 403; **Cause**: The identity is missing an RBAC role on the target scope",
      '**Interview answer:** "A federated credential lets an external workload like GitHub Actions, Azure DevOps, or an AKS pod use its own short-lived OIDC token to get an Azure token, so no client secret is stored. I add it to a user-assigned managed identity or app registration with three values: the issuer, the exact subject, for example a specific repo and environment, and the audience `api://AzureADTokenExchange`. Then I assign RBAC roles to the identity. In GitHub Actions, I set `id-token: write` and use `azure/login` with just the client, tenant, and subscription IDs. The most common error is a subject mismatch, so I keep the subject as specific as possible, for example scoped to the prod environment."',
    ],
    code: [
      {
        title: 'Federated credential token flow',
        language: 'text',
        code: `GitHub Actions / Azure DevOps / AKS pod
        |  1. gets its own OIDC token (signed by the issuer)
        v
Microsoft Entra ID
        |  2. checks the federated credential:
        |     issuer matches? subject matches? audience matches?
        v
Azure access token (short-lived)
        |  3. used to call Azure with the identity's RBAC roles
        v
Azure resources`,
      },
      {
        title: 'Identity with a GitHub federated credential',
        language: 'bash',
        code: `az identity create -g rg-cicd -n id-github-orders

az identity federated-credential create \\
  --name github-orders-prod \\
  --identity-name id-github-orders \\
  --resource-group rg-cicd \\
  --issuer "https://token.actions.githubusercontent.com" \\
  --subject "repo:myorg/orders-api:environment:prod" \\
  --audiences "api://AzureADTokenExchange"`,
      },
      {
        title: 'Federated credential on an app registration',
        language: 'bash',
        code: `az ad app federated-credential create --id <app-id> --parameters '{
  "name": "github-orders-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:myorg/orders-api:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'`,
      },
      {
        title: 'Assign RBAC to the identity',
        language: 'bash',
        code: `az role assignment create \\
  --assignee-object-id "$(az identity show -g rg-cicd -n id-github-orders --query principalId -o tsv)" \\
  --assignee-principal-type ServicePrincipal \\
  --role Contributor \\
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-orders-prod"`,
      },
      {
        title: 'GitHub Actions workflow with azure/login',
        language: 'yaml',
        code: `name: deploy
on:
  push:
    branches: [main]

permissions:
  id-token: write     # allows the job to request the OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod   # must match the federated credential subject
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: \${{ vars.AZURE_CLIENT_ID }}
          tenant-id: \${{ vars.AZURE_TENANT_ID }}
          subscription-id: \${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: az group show -n rg-orders-prod`,
      },
    ],
    followUps: [
      'Why does the subject have to match exactly, and how do you scope it to an environment?',
      'How many federated credentials can one identity have, and how do you handle many repos or branches?',
      'How does the same mechanism work for AKS Workload ID?',
    ],
    tags: ['azure', 'federated credentials', 'oidc', 'github actions', 'managed identity'],
  },
]
