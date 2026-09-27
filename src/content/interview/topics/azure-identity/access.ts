import type { InterviewQuestion } from '../../../types'

/** Sign-in controls: Conditional Access, MFA and external identities. */
export const azureIdentityAccessQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azid-11',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How does Conditional Access work? Describe a baseline set of policies you would deploy.',
    probing:
      'The Zero Trust engine of Entra. They want signals, decisions and enforcement, a sensible baseline, and safe rollout with report-only and break-glass exclusions.',
    answer: [
      'Conditional Access is an **if-then engine evaluated at sign-in**, after the first factor. The **if** is a set of signals: who the user is and which groups they are in, which app they are signing in to, the device platform and whether the device is compliant or hybrid-joined, the location or IP range, the client app, and sign-in or user **risk** from Identity Protection. The **then** is a decision: block, or grant with requirements such as MFA, a compliant device, an authentication strength, or a terms-of-use acceptance, plus session controls like sign-in frequency.',
      'All policies that match are applied **together**, and every requirement must be satisfied. A block in any matching policy wins.',
      'A baseline I would deploy: **require MFA for all users**; require **phishing-resistant MFA for admin roles**; **block legacy authentication**, which cannot do MFA; require MFA for **Azure management** - the portal, CLI and PowerShell; require a **compliant or hybrid-joined device** for sensitive apps; and block or step up **high sign-in risk**.',
      'Rollout matters as much as content. Every new policy starts in **report-only** mode, I check its impact in the sign-in logs and the **What If** tool, and every policy **excludes the two break-glass accounts**. Without those exclusions a single mistake can lock every administrator out of the tenant.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'What happens at sign-in',
        caption: 'Every matching policy applies; a block anywhere wins.',
        nodes: [
          { label: 'First factor succeeds', detail: 'Password, passkey, federation' },
          {
            label: 'Gather signals',
            detail: 'User, app, device, location, risk',
            tone: 'accent',
          },
          {
            label: 'Evaluate all matching policies',
            branch: { label: 'Any block', detail: 'Access denied', tone: 'danger' },
          },
          { label: 'Satisfy grant controls', detail: 'MFA, compliant device, strength' },
          { label: 'Token issued with session controls', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'A report-only policy via Microsoft Graph',
        language: 'json',
        code: `{
  "displayName": "CA010 - Require MFA for Azure management",
  "state": "enabledForReportingButNotEnforced",
  "conditions": {
    "users": {
      "includeUsers": ["All"],
      "excludeGroups": ["<breakglass-group-id>"]
    },
    "applications": {
      "includeApplications": ["797f4846-ba00-4fd7-ba43-dac1f8f63013"]
    },
    "clientAppTypes": ["all"]
  },
  "grantControls": {
    "operator": "OR",
    "builtInControls": ["mfa"]
  }
}`,
        explanation:
          '797f4846-... is the well-known app ID for Windows Azure Service Management API, which covers the portal, CLI and PowerShell.',
        placeholders: ['<breakglass-group-id>'],
      },
      {
        title: 'What would report-only policies have done?',
        language: 'text',
        code: `SigninLogs
| where TimeGenerated > ago(7d)
| mv-expand ConditionalAccessPolicies
| extend policy = tostring(ConditionalAccessPolicies.displayName),
         result = tostring(ConditionalAccessPolicies.result)
| where result in ("reportOnlyFailure", "reportOnlyInterrupted")
| summarize users = dcount(UserPrincipalName), signins = count() by policy, result`,
      },
    ],
    traps: [
      'Enabling a tenant-wide policy directly in "On" without report-only first.',
      'No break-glass exclusion.',
      'Thinking policies are evaluated in priority order. There is no order; they combine.',
      'Expecting Conditional Access to apply to service principal sign-ins. It needs Workload ID policies for that.',
    ],
    followUps: [
      'How is Conditional Access different from security defaults?',
      'What is an authentication strength?',
      'How would you apply Conditional Access to a service principal?',
    ],
    tags: ['conditional access', 'mfa', 'zero trust', 'entra id'],
  },
  {
    id: 'itv-azid-12',
    level: 'basic',
    kind: 'multi',
    prompt:
      'Which of these are phishing-resistant authentication methods in Entra ID? Select all that apply.',
    options: [
      { id: 'a', text: 'FIDO2 security keys and passkeys' },
      { id: 'b', text: 'Windows Hello for Business' },
      { id: 'c', text: 'SMS one-time codes' },
      { id: 'd', text: 'Certificate-based authentication' },
      { id: 'e', text: 'Microsoft Authenticator push approval without number matching' },
    ],
    correct: ['a', 'b', 'd'],
    probing:
      'Knowing that "MFA" is not one thing. Admin accounts need methods an attacker in the middle cannot relay.',
    answer: [
      '**FIDO2 keys and passkeys**, **Windows Hello for Business** and **certificate-based authentication** are phishing-resistant, because the credential is cryptographically bound to the real sign-in origin or device. A fake login page cannot capture something it can replay.',
      '**SMS codes** can be phished by a proxy page or stolen by SIM swapping, and simple **push approvals** invite MFA fatigue - the attacker triggers prompts until the user taps approve. Number matching reduces that, but a code or push relayed through an attacker’s proxy is still not phishing-resistant. Those methods are better than a password alone, which is why they remain acceptable for general users while admins get the stronger ones via an authentication strength in Conditional Access.',
    ],
    code: [
      {
        title: 'Which methods are users actually registered with?',
        language: 'bash',
        code: `az rest --method get \\
  --url "https://graph.microsoft.com/v1.0/reports/authenticationMethods/userRegistrationDetails?\\$select=userPrincipalName,isAdmin,methodsRegistered" \\
  --query "value[?isAdmin].{user:userPrincipalName, methods:methodsRegistered}" -o jsonc`,
      },
    ],
    traps: ['Treating any MFA as equal for privileged accounts.'],
    followUps: ['How would you migrate admins to phishing-resistant MFA without locking them out?'],
    tags: ['mfa', 'passkeys', 'fido2', 'authentication'],
  },
  {
    id: 'itv-azid-13',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain B2B collaboration versus customer identity (formerly Azure AD B2C, now Entra External ID). When would you use each?',
    probing:
      'Partners versus customers. They want the tenant model - guests in your workforce tenant versus a separate external tenant - and awareness of the product naming change.',
    answer: [
      '**B2B collaboration** is for **partners, contractors and suppliers** who need access to **your** apps and resources. They are added to your workforce tenant as **guest users**, but they authenticate with their own organisation’s identity, a Microsoft account, or a one-time passcode. You manage their access with the same groups, Conditional Access and access reviews as employees, and **cross-tenant access settings** decide whether you trust their MFA and device claims.',
      '**Customer identity** - consumer and business customers of your public app - is a different problem: millions of self-service sign-ups, social logins, custom-branded pages, and no expectation that they appear in your staff directory. That was **Azure AD B2C**. Microsoft’s current product for new projects is **Microsoft Entra External ID in an external tenant**, a separate tenant configured for customers, with user flows for sign-up and sign-in.',
      'So: a supplier logging in to your internal SharePoint or an Azure resource is B2B. A shopper logging in to your web store is customer identity in an external tenant. Mixing the two - putting customers into your workforce tenant as guests - creates licensing, governance and security problems.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which external identity model?',
        caption:
          'Partners join your workforce tenant as guests; customers live in a separate external tenant.',
        question: 'Who is the external user?',
        branches: [
          {
            condition: 'Partner or contractor using your apps',
            result: 'B2B guest in workforce tenant',
            detail: 'Groups, CA, access reviews',
            tone: 'accent',
          },
          {
            condition: 'Two organisations sharing Teams',
            result: 'B2B direct connect',
            detail: 'Cross-tenant access settings',
          },
          {
            condition: 'Customers of a public app',
            result: 'External ID external tenant',
            detail: 'Self sign-up, social logins, branding',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Invite a B2B guest and review guests later',
        language: 'bash',
        code: `az rest --method post --url https://graph.microsoft.com/v1.0/invitations \\
  --body '{
    "invitedUserEmailAddress": "sam@partner.example",
    "inviteRedirectUrl": "https://myapps.microsoft.com",
    "sendInvitationMessage": true
  }'

# All guests and when they last signed in (needs AuditLog.Read.All)
az rest --method get \\
  --url "https://graph.microsoft.com/v1.0/users?\\$filter=userType eq 'Guest'&\\$select=displayName,mail,signInActivity" \\
  --headers ConsistencyLevel=eventual`,
      },
    ],
    traps: [
      'Describing Azure AD B2C as the current default for new customer identity projects.',
      'Adding customers as guests in the workforce tenant.',
      'Guests with no expiry or access review, accumulating for years.',
    ],
    followUps: [
      'How do cross-tenant access settings let you trust a partner’s MFA?',
      'How would you clean up stale guest accounts?',
    ],
    tags: ['b2b', 'external id', 'b2c', 'guests', 'entra id'],
  },
  {
    id: 'itv-azid-14',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Someone enabled a Conditional Access policy requiring compliant devices for "All cloud apps". Now half the admins cannot sign in to the portal, and a nightly job reports failures. What do you do?',
    probing:
      'Incident response in identity: regain access safely, scope the blast radius with sign-in logs, fix the policy properly, and understand why the job failed or did not.',
    answer: [
      'First **regain control**. If any admin with Conditional Access Administrator can still sign in from a compliant device, they switch the policy to **report-only** or off. If nobody can, that is what the **break-glass accounts** are for - they are excluded from every CA policy precisely for this moment. If the break-glass accounts were not excluded, the path is a Microsoft support case, which is slow; that is the lesson to fix first.',
      'Then **scope the impact** from the sign-in logs: filter for failures with error 53000, device not compliant, since the change, and group by user and application. That tells me who was blocked, which apps, and whether it was admins on unmanaged jump boxes, contractors on personal devices, or everyone.',
      'For the **nightly job**, I check what it is. A job running as a **user account** is blocked like any user - which is itself a finding, because automation should not use user accounts. A job running as a **service principal or managed identity** is not affected by user CA policies at all, so its failure is probably something else and I would not assume.',
      'Afterwards the policy is rebuilt properly: scoped to the apps that need device compliance, with break-glass excluded, started in report-only, reviewed with the What If tool, and changed through a pull request if CA is managed as code. And the change process gets a two-person review for tenant-wide policies.',
    ],
    code: [
      {
        title: 'Who was blocked by device compliance since the change?',
        language: 'text',
        code: `SigninLogs
| where TimeGenerated > datetime(2026-09-26T18:00:00Z)
| where ResultType == 53000        // device is not compliant or not managed
| summarize failures = count(), apps = make_set(AppDisplayName, 10)
    by UserPrincipalName, tostring(DeviceDetail.operatingSystem)
| order by failures desc`,
      },
      {
        title: 'Switch a policy to report-only from the command line',
        language: 'bash',
        code: `az rest --method patch \\
  --url "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/<policy-id>" \\
  --body '{ "state": "enabledForReportingButNotEnforced" }'`,
        placeholders: ['<policy-id>'],
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Recovering from a lockout policy',
        caption: 'Break-glass accounts exist for exactly this; excluding them is not optional.',
        nodes: [
          { label: 'Admins blocked at sign-in', tone: 'danger' },
          { label: 'Break-glass or unaffected admin signs in' },
          { label: 'Policy to report-only', tone: 'warning' },
          { label: 'Sign-in logs: error 53000 by user and app', tone: 'accent' },
          { label: 'Rebuild: scoped, excluded, report-only first' },
          { label: 'Two-person review for tenant-wide CA', tone: 'success' },
        ],
      },
    ],
    deeper: [
      'Conditional Access for **workload identities** exists - it can block service principal sign-ins from outside known IP ranges - but it is a separate policy type with its own licence. User policies never touch service principals.',
      'Managing CA as code - Graph API or a tool like Microsoft365DSC - lets you diff the change that caused the outage and revert it with a pipeline rather than clicking.',
      'Device compliance comes from Intune. A device that is enrolled but has not checked in recently can show as non-compliant, so "compliant device" policies should come with an Intune grace period plan.',
    ],
    traps: [
      'Having no break-glass account excluded from the policy.',
      'Assuming the service principal job was blocked by a user CA policy.',
      'Deleting the policy instead of switching it to report-only, losing the evidence.',
    ],
    followUps: [
      'How would you test a CA policy change before enabling it?',
      'How do you monitor break-glass accounts?',
    ],
    tags: ['scenario', 'conditional access', 'break-glass', 'incident', 'sign-in logs'],
  },
]
