import type { InterviewTopic } from '../../../types'
import { myKubernetesArchitectureQuestions } from './architecture'
import { myKubernetesWorkloadQuestions } from './workloads'
import { myKubernetesTroubleshootingQuestions } from './troubleshooting'
import { myKubernetesSecurityQuestions } from './security'
import { myKubernetesOperationsQuestions } from './operations'
import { myKubernetesEdgeCaseQuestions } from './edge-cases'

export const myKubernetesTopic: InterviewTopic = {
  id: 'my-kubernetes',
  group: 'bank',
  title: 'My Kubernetes questions',
  shortTitle: 'My Kubernetes',
  icon: '☸️',
  order: 104,
  oneLiner:
    'My own Kubernetes bank: architecture and objects, probes and scaling, Pod and node troubleshooting, security, upgrades and DR, and the tricky edge cases.',
  headlines: [
    'Controllers continuously reconcile actual state to desired state; if the control plane is down, running containers keep going but scheduling, updates and self-healing stop.',
    'Readiness gates traffic, liveness restarts a stuck process, startup protects slow starters - a liveness probe that checks a dependency can restart every healthy Pod at once.',
    'Requests drive scheduling and QoS; memory over the limit is OOMKilled (exit 137), CPU over the limit is throttled.',
    'Troubleshoot in one order: describe and Events, current and --previous logs, the owning controller - never just delete the Pod repeatedly.',
    'A PDB only limits voluntary disruptions such as drains and upgrades; it does nothing for a node crash or an OOM kill.',
    'StatefulSet Pods keep their ordinal names and PVCs; on a lost node they stay Terminating to avoid split brain until you confirm the node is dead.',
    'base64 is not encryption: use encryption at rest, least-privilege RBAC, workload identity and an external secret manager.',
    'Upgrade one minor version at a time: check deprecated APIs and add-ons, upgrade the control plane, then drain node pools gradually respecting PDBs.',
  ],
  questions: [
    ...myKubernetesArchitectureQuestions,
    ...myKubernetesWorkloadQuestions,
    ...myKubernetesTroubleshootingQuestions,
    ...myKubernetesSecurityQuestions,
    ...myKubernetesOperationsQuestions,
    ...myKubernetesEdgeCaseQuestions,
  ],
}
