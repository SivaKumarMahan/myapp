import type { InterviewTopic } from '../../../types'
import { myStudyPlatformKubernetesQuestions } from './kubernetes'
import { myStudyPlatformAzureQuestions } from './azure'
import { myStudyPlatformToolingQuestions } from './tooling'
import { myStudyPlatformTerraformQuestions } from './terraform'
import { myStudyPlatformScriptingQuestions } from './scripting'

export const myStudyPlatformTopic: InterviewTopic = {
  id: 'my-study-platform',
  group: 'bank',
  title: 'Study: platform deep dives',
  shortTitle: 'Study: platforms',
  icon: '📚',
  order: 120,
  oneLiner:
    'Platform and tooling deep dives from my study notes - Kubernetes objects and operations, Argo CD GitOps, Jenkins pipelines for AKS, Terraform fundamentals and CI/CD, Azure HA and security, Docker, Ansible, shell and Python.',
  headlines: [
    'ConfigMap = non-sensitive config; Secret = sensitive data (base64 is not encryption); ServiceAccount = Pod identity; Namespace = logical isolation.',
    'Service `port` is the Service port, `targetPort` the container port, `nodePort` the port opened on every node.',
    'HPA scales Pods, Cluster Autoscaler scales nodes, VPA adjusts requests - and CPU-based HPA only works with realistic requests.',
    'GitOps: CI builds the image and updates the tag in Git; Argo CD reconciles the cluster and self-heals drift. It only talks to Kubernetes.',
    'Promote the same tested image to production - build once, deploy many - and gate production with approval and smoke tests.',
    'Prefer separate directories and state per environment over workspaces; version modules; plan on PR, apply the saved plan after approval.',
    'COPY by default, ADD only for local tar extraction; ENTRYPOINT is the fixed executable, CMD the overridable default arguments.',
    'Production shell scripts: `set -Eeuo pipefail`, quoted variables, input validation, meaningful exit codes, traps, locks and no secrets in logs.',
  ],
  questions: [
    ...myStudyPlatformKubernetesQuestions,
    ...myStudyPlatformAzureQuestions,
    ...myStudyPlatformToolingQuestions,
    ...myStudyPlatformTerraformQuestions,
    ...myStudyPlatformScriptingQuestions,
  ],
}
