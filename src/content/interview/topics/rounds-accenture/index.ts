import type { InterviewTopic } from '../../../types'
import { roundsAccentureQuestions } from './questions'

export const roundsAccentureTopic: InterviewTopic = {
  id: 'rounds-accenture',
  group: 'rounds',
  title: 'Accenture rounds',
  shortTitle: 'Accenture',
  icon: '🏢',
  order: 211,
  oneLiner:
    'Questions from the Accenture round: Trivy and SonarQube in the pipeline, troubleshooting a bad deployment, Gateway API, real automation examples, observability on Azure, SAML/OIDC SSO with Entra ID, EC2-to-S3 access, high CPU on VMs and AKS, and an unexpected destroy in terraform plan.',
  headlines: [
    'SonarQube checks source code (SAST, Quality Gate); Trivy checks dependencies, IaC, secrets and images, and the image is scanned before it is pushed to ACR.',
    'When a release breaks production, roll back first, then work through rollout status, Pod events and logs, Service endpoints, config and dependencies, and finish with an RCA.',
    'Gateway API is the role-based successor to Ingress: GatewayClass, Gateway and HTTPRoute, with header routing and weighted canaries built into the standard.',
    'Tell each automation as problem, what you built, tools and measurable result, not as a list of tools.',
    'Cover metrics, logs and traces: Managed Prometheus with Grafana, Container Insights with KQL, Application Insights, and actionable alerts that each have an owner and a runbook.',
    'Connect EC2 to S3 with an IAM role through an instance profile, never access keys, plus a VPC gateway endpoint and a bucket policy that locks access down.',
    'A destroy in terraform plan means stop: find the cause (workspace, rename, count shift, ForceNew, drift), fix it with moved, removed or lifecycle, and block deletes in the pipeline.',
  ],
  questions: roundsAccentureQuestions,
}
