import type { InterviewTopic } from '../../../types'
import { myArtifactsQuestions } from './artifacts'
import { myNexusQuestions } from './nexus'

export const myArtifactsTopic: InterviewTopic = {
  id: 'my-artifacts',
  group: 'bank',
  title: 'My artifact repository questions',
  shortTitle: 'My artifacts',
  icon: '📦',
  order: 109,
  oneLiner:
    'My artifact repository notes: Azure Artifacts, JFrog Artifactory, GitHub Packages and a deep dive on Sonatype Nexus, plus registries, signing and promoting one immutable artifact.',
  headlines: [
    'Build once, publish a version that never changes, record its checksum or digest, and promote those same bytes everywhere.',
    'Azure DevOps shops: Azure Artifacts for package feeds and Universal Packages, Azure Container Registry for images.',
    'Nexus has hosted (publish here), proxy (cache a remote) and group (one read URL) repositories; group member order decides which coordinate wins.',
    'Keep snapshots and releases in separate repositories and disable redeploy on releases - fix a bad release with a new version.',
    'For a Maven publish, the `distributionManagement` repository ID must match the `<server>` ID in `settings.xml`.',
    'Nexus cleanup soft-deletes; blob-store compaction reclaims space. Back up the database and blob stores together and test restores.',
    'Troubleshoot publishing from the HTTP status: 401 credential, 403 privilege, 404 URL, 400/409 metadata or redeploy policy, 5xx server.',
    'Signing proves origin and integrity, not quality - verify signature, issuer and digest at deployment.',
  ],
  questions: [...myArtifactsQuestions, ...myNexusQuestions],
}
