import type { InterviewTopic } from '../../../types'
import { azureMonitoringPlatformQuestions } from './platform'
import { azureMonitoringSecurityQuestions } from './security'
import { azureMonitoringIncidentQuestions } from './incidents'

export const azureMonitoringTopic: InterviewTopic = {
  id: 'azure-monitoring',
  title: 'Monitoring, security & incident scenarios',
  shortTitle: 'Ops & security',
  icon: '🛡️',
  order: 8,
  oneLiner:
    'Metrics versus logs, workspace design and KQL, OpenTelemetry, alerts and DCRs, Defender, Sentinel, Key Vault and Policy - then the 2am incidents that test all of it.',
  headlines: [
    'Metrics are fast numeric time series (93 days); logs are rich records in a Log Analytics workspace queried with **KQL**.',
    'Resource logs need a **diagnostic setting**; guest data needs the **Azure Monitor Agent** plus a DCR association. MMA is retired.',
    'Fewer workspaces is the default. Separate with resource-context and table RBAC, and cut cost with Basic/Auxiliary plans and DCR transformations.',
    'Alert rule = what, action group = who, alert processing rule = suppress or route at scale. Page on user-facing symptoms and SLO burn.',
    'Secure score comes from **recommendations**; threat alerts do not change it. Exemptions need a reason and an expiry.',
    'Key Vault: RBAC model, purge protection, private endpoint; rotation needs two valid credentials, triggered by SecretNearExpiry.',
    'DeployIfNotExists creates missing companions (diagnostic settings, agents) and needs a managed identity plus remediation tasks.',
    'Incidents: confirm with Service Health and the activity log before acting; for leaked secrets, revoke first and investigate second.',
  ],
  questions: [
    ...azureMonitoringPlatformQuestions,
    ...azureMonitoringSecurityQuestions,
    ...azureMonitoringIncidentQuestions,
  ],
}
