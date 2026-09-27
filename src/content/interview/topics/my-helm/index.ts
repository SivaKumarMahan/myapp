import type { InterviewTopic } from '../../../types'
import { myHelmChartQuestions } from './charts'
import { myHelmReleaseQuestions } from './releases'

export const myHelmTopic: InterviewTopic = {
  id: 'my-helm',
  group: 'bank',
  title: 'My Helm questions',
  shortTitle: 'My Helm',
  icon: '⛵',
  order: 105,
  oneLiner:
    'My own Helm bank: chart structure, values and templating, multi-environment promotion, hooks, secrets, signing, rollback and troubleshooting.',
  headlines: [
    'A chart is a versioned package, a release is one installed instance of it, and a repository (or OCI registry) is where charts are published.',
    'Helm renders YAML and submits it to the API; Kubernetes controllers still do the rollout, so Helm alone does not guarantee zero downtime.',
    '`helm upgrade --install` works for first and later deploys; `--atomic` rolls back a failed upgrade and implies `--wait`.',
    'One chart, one values file per environment: promote the same chart version and image digest, never copy charts per environment.',
    'Never put plaintext secrets in values, Git or `--set`; release data is stored in the cluster, so use External Secrets, CSI or SOPS.',
    'Hooks run at lifecycle points; a rollback does not undo a database migration run by a hook.',
    'Sign with `helm package --sign` and check with `helm verify`, or Cosign for OCI charts - signing proves origin, not safety.',
    'Debug failures with `helm status`, `helm get values`, `helm get manifest` and Kubernetes events before `helm rollback`.',
  ],
  questions: [...myHelmChartQuestions, ...myHelmReleaseQuestions],
}
