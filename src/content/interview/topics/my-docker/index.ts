import type { InterviewTopic } from '../../../types'
import { myDockerFundamentalsQuestions } from './fundamentals'
import { myDockerDockerfileQuestions } from './dockerfile'
import { myDockerToolingQuestions } from './tooling'
import { myDockerOperationsQuestions } from './operations'

export const myDockerTopic: InterviewTopic = {
  id: 'my-docker',
  group: 'bank',
  title: 'My Docker questions',
  shortTitle: 'My Docker',
  icon: '🐳',
  order: 106,
  oneLiner:
    'My own Docker notes: images and layers, production Dockerfiles, volumes and networks, Compose and Bake, supply-chain security, safe cleanup and container troubleshooting.',
  headlines: [
    'An image is immutable layers; the container adds a writable layer that dies with it - persistent data belongs in a volume or an external service.',
    'Namespaces isolate what a container can see; cgroups limit what it can use. Over the memory limit is an OOM kill, over CPU is throttling.',
    'Copy dependency files before source so the cache survives; clean package caches in the same RUN; multi-stage keeps build tools out of runtime.',
    'Exec-form ENTRYPOINT/CMD so the app is PID 1 and gets SIGTERM; docker run args replace CMD, --entrypoint replaces ENTRYPOINT.',
    'Never put secrets in ARG, ENV or layers - use BuildKit secret mounts at build time and a secret manager at runtime; a leaked layer means rotate.',
    'Tag by commit SHA, deploy by digest, never overwrite tags; scan with Trivy in CI and again in the registry; sign and verify.',
    'Compose is for local and single-host; production needs an orchestrator. A user-defined bridge gives DNS by container name.',
    'Check docker system df before pruning; never prune --volumes blindly or touch /var/lib/docker by hand on a live host.',
  ],
  questions: [
    ...myDockerFundamentalsQuestions,
    ...myDockerDockerfileQuestions,
    ...myDockerToolingQuestions,
    ...myDockerOperationsQuestions,
  ],
}
