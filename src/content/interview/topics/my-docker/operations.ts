import type { InterviewQuestion } from '../../../types'

/** Docker security, supply chain, cleanup, troubleshooting and production scenarios. */
export const myDockerOperationsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mydk-36',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you built Docker containers? For what use case?',
    probing:
      'Whether you have real experience end to end: Dockerfile practices, CI supply chain, and what you verify before shipping.',
    answer: [
      'Yes. A typical use case is packaging a web API so it runs the same way on developer laptops, in CI, and in Kubernetes. I write a multi-stage Dockerfile, run the container as a non-root user, expose only the port the app actually needs, add a health check where it makes sense, and keep configuration outside the image.',
      'In CI, the build starts from a pinned base image, runs the tests, generates an SBOM (a list of everything packaged inside the image), scans it with Trivy, and tags it with the commit SHA. That exact build is pushed to a private registry and never changes afterward. Kubernetes then deploys that same build with resource limits, health probes, a locked-down security context, and secrets pulled from outside the image.',
      'Before it ships, I check image size and layer count, the scan results, startup time, health checks, logs, how it handles shutdown signals, and whether it still works with a read-only filesystem. This is what avoids "works on my machine" problems — one build, tested once, runs everywhere.',
    ],
    tags: ['experience', 'ci/cd'],
  },
  {
    id: 'itv-mydk-37',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you ensure Docker image immutability?',
    probing:
      'Whether you tag by commit/version, deploy by digest, never overwrite tags, block latest, and verify signatures.',
    answer: [
      'Tag images with a version or commit hash. Push that exact tag to the registry and never overwrite it. Block `latest` from being used in pipelines.',
      "The idea is that once an image is built and tagged, it never changes. If you need a new version, you build a new tag — you don't overwrite the old one.",
      'I tag every build with a commit hash or version number, and I reference images by their digest (a fixed hash of the exact content) rather than a mutable tag like `latest`. CI signs the digest before pushing, and deployment verifies that signature so nobody can quietly swap the image for something else.',
      "This makes rollback simple and reliable: to go back, you just redeploy the previous tag or digest, knowing it's exactly the same bytes that were tested before.",
    ],
    tags: ['immutability', 'tags', 'supply chain'],
  },
  {
    id: 'itv-mydk-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Docker containers in CI/CD pipelines?',
    probing:
      'Whether you place controls at build, CI scan/sign, and deploy time, and keep bases patched by rebuilding.',
    answer: [
      'Run image scans with Trivy or Anchore. Use non-root users. Apply resource limits. Keep images updated.',
      'Security in the pipeline happens at a few checkpoints. During the build, I use a small pinned base image, a `.dockerignore` file, and a non-root user. In CI, I scan the image and its dependencies for known vulnerabilities and fail the pipeline if anything High or Critical is found. Before the image ships, I generate an SBOM and sign it.',
      'At deploy time, containers run with dropped capabilities, a read-only filesystem where possible, resource limits, and no access to the Docker socket. I also keep base images current by rebuilding regularly, not just when something breaks.',
    ],
    tags: ['security', 'ci/cd'],
  },
  {
    id: 'itv-mydk-39',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Are you aware of security scanning tools? How do you scan Docker images — both during build and at the registry level?',
    probing:
      'Whether you scan in CI with a failing gate and again in the registry, and know current tooling names.',
    answer: [
      'I scan images at two points: during the build, and again once they land in the registry.',
      'During the build, I run **Trivy** as part of CI to catch OS-level and dependency-level vulnerabilities before the image ever gets deployed. After the image is pushed to Azure Container Registry, **Microsoft Defender for Containers** scans it automatically and surfaces any CVEs in Microsoft Defender for Cloud (formerly Azure Security Center). To enforce this, the build fails automatically if Trivy finds anything rated High or Critical.',
      '**Trivy scan during build:**',
      '1. Install Trivy in your CI environment.\n2. Add a scan step in your pipeline after building the image.',
      'You can add this scan step to any CI system:',
      "- A Jenkins pipeline (`stage('Security Scan')`)\n- An Azure DevOps YAML pipeline (`bash: trivy image $(imageName)`)\n- A GitHub Actions workflow",
      "**Docker's native scan:** the old `docker scan` command (powered by Snyk) has been retired; its replacement is **Docker Scout** (`docker scout cves`), which integrates directly with Docker Desktop and Docker Hub.",
      '**Registry-level scanning — Azure Container Registry (ACR):**',
      "- Microsoft Defender for Containers scans images automatically after they're pushed.\n- It finds CVEs and surfaces them in Microsoft Defender for Cloud.",
      'Enable scanning in the Azure portal:',
      '- Enable the Defender for Containers plan in Microsoft Defender for Cloud for the subscription that holds the registry.\n- Turn on vulnerability assessment for registry images.',
      'View results in Defender for Cloud under the container registry vulnerability recommendations.',
    ],
    code: [
      {
        title: 'Trivy scan after build',
        language: 'bash',
        code: `# Install Trivy
sudo apt install trivy -y

# Scan Docker image after build
docker build -t myapp:latest .
trivy image myapp:latest`,
      },
      {
        title: 'Output example',
        language: 'text',
        code: `myapp:latest (ubuntu 22.04)
============================
Total: 8 (CRITICAL: 2, HIGH: 3, MEDIUM: 3)`,
      },
      {
        title: 'Fail the build on High or above',
        language: 'bash',
        code: 'trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:latest',
      },
      {
        title: 'Docker Scout (replacement for docker scan)',
        language: 'bash',
        code: 'docker scout cves myapp:latest',
      },
    ],
    tags: ['scanning', 'trivy', 'acr'],
  },
  {
    id: 'itv-mydk-40',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you ensure Docker container security at runtime?',
    probing:
      'Whether you treat image, runtime and host as separate layers and name concrete controls like Falco, seccomp and no socket mounts.',
    answer: [
      'Use Falco or AquaSec to watch for suspicious behavior. Restrict root access. Apply AppArmor or SELinux profiles.',
      'I look at the image, the runtime setup, and the host as three separate things. For builds, I use multi-stage Dockerfiles, a small pinned base image, a `.dockerignore` file, cache-friendly dependency ordering, and a non-root user at runtime.',
      "In CI, I scan dependencies and the image, generate an SBOM (a list of everything in the image), and sign the final build so it can't be swapped for something else later. The image is pushed over TLS to a registry with tightly scoped access, and deployment checks that signature before using it.",
      "At runtime I drop capabilities the container doesn't need, use seccomp/AppArmor/SELinux, make the filesystem read-only where possible, set resource limits, avoid giving containers access to the Docker socket, and restrict network access.",
      'If startup is slow or a push keeps failing, I measure things instead of guessing: layer size and cache hits, registry DNS/auth/TLS, disk space, and application startup time. Once I find the cause, I rebuild from a patched base and re-check that everything still works.',
    ],
    followUps: [
      'What would a Falco rule for a shell spawned in a container look like?',
      'Why is mounting /var/run/docker.sock into a container so dangerous?',
    ],
    tags: ['security', 'runtime'],
  },
  {
    id: 'itv-mydk-41',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle secrets inside containers?',
    probing:
      'Whether you keep secrets out of images entirely, prefer workload identity, and know that leaked layers mean rotation.',
    answer: [
      "Secrets never go into images, into a Dockerfile's `ARG` or `ENV`, into layers, or into source code. At runtime, they come from Kubernetes Secrets combined with an external secret manager or CSI driver, from Docker secrets where that's supported, or from a short-lived mounted file.",
      'Where possible, I use workload identity (the platform proving who the workload is) instead of a long-lived cloud access key.',
      "Secret files get narrow file permissions and a short lifecycle, and logs and diagnostics are set up to redact them. Image scanning can catch an accidentally-included secret, but once one is found, deleting it from a later layer doesn't remove it from history — the only real fix is to rotate the secret immediately and rebuild.",
      "I test that the image's history and any exported copy contain no secret, that only authorized workloads can read it, and that rotating a secret doesn't cause downtime.",
    ],
    followUps: [
      'How does a BuildKit secret mount keep a build-time credential out of the image?',
      'How would you rotate a secret without restarting every pod at once?',
    ],
    tags: ['secrets', 'security'],
  },
  {
    id: 'itv-mydk-42',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you enforce policy as code for Docker security?',
    probing:
      'Whether you name tools and rules, test the policies themselves, roll out in audit mode and allow time-boxed exceptions.',
    answer: [
      'CI checks Dockerfiles, images, and deployment configuration against a set of rules, using tools like OPA/Conftest, Checkov, Hadolint, Trivy, and Kubernetes admission policies.',
      'Typical rules require: no root user, only approved registries and base images, images referenced by a fixed digest rather than a mutable tag, no privileged mode, dropped capabilities, a read-only filesystem, and a vulnerability threshold that must be met.',
      'I test each rule against both compliant and non-compliant examples, version the rules themselves, give clear guidance on how to fix a violation, and allow a time-limited exception process rather than a permanent bypass. Signing and build provenance — a record of where an image came from and how it was built — get checked again at deployment time.',
      "Policy as code works alongside runtime controls, RBAC, network segmentation, monitoring, and regular patching — it's one layer, not the whole defense. I usually start new rules in audit-only mode so I can see their impact before actually blocking anything.",
    ],
    followUps: [
      'How would you write a Conftest rule that rejects images without a digest?',
      'How do you handle a team that needs an exception to the non-root rule?',
    ],
    tags: ['policy as code', 'security', 'compliance'],
  },
  {
    id: 'itv-mydk-43',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you handle multi-cloud Docker deployments with compliance restrictions?',
    probing:
      'Whether you build once, replicate the same digest, and enforce residency, identity, signing and audit controls per cloud.',
    answer: [
      'I build one approved image in a single controlled pipeline, generate its SBOM and provenance record, scan and sign it, and then replicate that exact same digest to approved regional registries in each cloud. The image content stays identical everywhere; only cloud-specific deployment configuration differs.',
      "Controls cover where data can live, where the registry is located and how it's encrypted, identity federation across clouds, private network connectivity, vulnerability policy, who holds the signing keys, audit log retention, and runtime security. Terraform modules and policy-as-code enforce a common baseline, and each cloud gets its own tightly scoped identities and state.",
      "I test that unapproved regions, unapproved registries, and unsigned images all get rejected. Disaster recovery planning has to account for registry availability too — replication needs to stay trustworthy, not just fast, and can't be used as an excuse to skip compliance checks.",
    ],
    followUps: [
      'How do you prove the image running in cloud B is the same one tested in cloud A?',
      'Who should own the signing keys in a multi-cloud setup?',
    ],
    tags: ['multi-cloud', 'compliance', 'registry'],
  },
  {
    id: 'itv-mydk-44',
    level: 'basic',
    kind: 'open',
    prompt: 'What are dangling Docker objects?',
    probing: 'Whether you define dangling precisely (untagged images) and inspect before pruning.',
    answer: [
      'A dangling image is one with no tag pointing to it — usually left behind after you rebuild an image with the same tag as before. Unused containers, networks, volumes, and build cache can also pile up and use disk space, but "dangling" specifically refers to untagged images.',
      "I check what's there before cleaning anything up. A volume might still hold important data, and an old image might be exactly what you'd need to roll back to — so I keep some retention around and treat registry images, not local ones, as the real source of truth.",
      "Any automated cleanup should have filters, disk thresholds, exclusions, logging, and a check that it isn't touching anything a live workload depends on.",
    ],
    code: [
      {
        title: 'Find and prune dangling images',
        language: 'bash',
        code: `docker image ls --filter dangling=true
docker system df -v
docker image prune`,
      },
    ],
    tags: ['cleanup', 'images'],
  },
  {
    id: 'itv-mydk-45',
    level: 'basic',
    kind: 'open',
    prompt: "What's the difference between docker system prune and docker system prune -a?",
    probing: 'Whether you know -a also removes tagged-but-unused images.',
    answer: [
      '- `docker system prune` removes unused containers, networks, and dangling images (images with no tag).\n- `docker system prune -a` goes further and removes all unused images, even ones that are still tagged.',
      'Never run `docker system prune` carelessly on a shared or production host — it can delete things that are still needed.',
    ],
    tags: ['cleanup', 'commands'],
  },
  {
    id: 'itv-mydk-46',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you delete all Docker resources in one command, or remove all containers and images safely?',
    probing:
      'Whether you resist the blanket prune on shared hosts, scope deletions, protect volumes and prefer host replacement in production.',
    answer: [
      'I wouldn\'t run a broad "delete everything" command on a shared or production host. `docker system prune -a --volumes` removes every unused container, network, image, build cache entry, and unused volume after you confirm — and that can destroy data or images you actually needed for a rollback.',
      "My actual approach: run `docker system df -v` to see what's using space, check what's still in use, back up any volume that matters, and then prune specific object types using age or label filters. In production, I'd rather replace a host outright when it needs cleaning than run an emergency deletion on a live one.",
      'After cleanup, I check that running containers are unaffected, disk and inode usage looks right, the app is healthy, and images can still be pulled. Anything destructive gets logged and approved beforehand.',
      '**Removing all containers and images safely:** first, I get clear on exactly what needs removing and make sure nothing stateful gets caught up in it. Containers can be stopped and removed explicitly, and an image can only be removed once nothing depends on it.',
      'On a disposable lab machine, commands like `docker container prune` and `docker image prune -a` are safer than a broad shell one-liner, because they show you the scope and ask for confirmation.',
      'In production, I never blindly remove every container or run `docker system prune --volumes` — a named volume might hold real application data, running services could get interrupted, and useful evidence could be lost.',
      "Instead, I check `docker system df`, remove only the stopped containers and unused images that are actually approved for removal, confirm the registry still has the images we might need, and keep volume backups. Ongoing cleanup should run on a retention policy with disk alerts, not as an emergency measure — and in production I'd rather replace a host than deep-clean a live one.",
    ],
    code: [
      {
        title: 'See what exists before removing',
        language: 'bash',
        code: `docker container ls -aq
docker image ls -q`,
      },
    ],
    tags: ['cleanup', 'production'],
  },
  {
    id: 'itv-mydk-47',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'If Docker containers are consuming too much disk space, how do you fix it?',
    probing:
      'Whether you measure with docker system df, prune by object type, and remember container json logs.',
    answer: [
      '**Check disk usage by Docker** with `docker system df`. This shows how much space is used by:',
      '- Images\n- Containers\n- Local volumes\n- Build cache',
      '**Remove stopped containers** with `docker container prune`, then **remove unused images, volumes, networks** by type. `docker system prune -a --volumes` deletes all unused containers, images, volumes, and networks — use it with care.',
      '**Check container log size** under `/var/lib/docker/containers`, and **truncate large logs safely** rather than deleting the open file.',
    ],
    code: [
      {
        title: 'Check and prune',
        language: 'bash',
        code: `docker system df

docker container prune

docker image prune
docker volume prune
docker network prune

# deletes all unused containers, images, volumes, and networks
docker system prune -a --volumes`,
      },
      {
        title: 'Find and truncate large container logs',
        language: 'bash',
        code: `sudo du -sh /var/lib/docker/containers/*/*-json.log | sort -hr | head

sudo truncate -s 0 /var/lib/docker/containers/<container-id>/<container-id>-json.log`,
      },
    ],
    tags: ['disk', 'cleanup', 'logs'],
  },
  {
    id: 'itv-mydk-48',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you prevent Docker from filling the disk again?',
    probing:
      'Whether you think in prevention: pruning schedule, log rotation limits, separate data volume.',
    answer: [
      "- Prune unused images regularly.\n- Set logging limits so container logs can't grow forever.\n- Store Docker's data on a dedicated volume or partition, separate from the rest of the OS.",
      'Ongoing cleanup should run on a retention policy with disk alerts, not as an emergency measure.',
    ],
    tags: ['disk', 'logs'],
  },
  {
    id: 'itv-mydk-49',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What happens if you delete /var/lib/docker/overlay on a Docker host?',
    probing:
      'Whether you know it corrupts images and container layers, and recover by rebuilding the host rather than hand-repairing.',
    answer: [
      "It can corrupt or destroy image data and container writable layers, and containers will start failing. I never manually delete anything inside Docker's internal storage directory while the daemon is using it.",
      "If the real problem is a full disk, the safe path is `docker system df` to see what's using space, then identifying objects, preserving volumes, and using the proper prune or removal commands with approval — not touching the internals directly.",
      'If that directory has already been deleted, I stop making further changes, preserve logs as evidence, check whether any volumes were affected separately, and usually rebuild the host from known-good configuration and re-pull the same fixed images, rather than attempting a risky manual repair.',
      "I then restore any persistent application data from a proper volume backup, validate the workloads, bring the host back into service, and add capacity alerts and automated cleanup so this doesn't happen again. Docker's internal storage directory is not something an operator should ever touch by hand.",
    ],
    followUps: [
      'Which storage driver does Docker use today, and where does it keep layers?',
      'How would you move /var/lib/docker to a bigger disk safely?',
    ],
    tags: ['storage', 'incident', 'overlay2'],
  },
  {
    id: 'itv-mydk-50',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'You need live patching of a Docker host kernel without downtime. How do you achieve it?',
    probing:
      'Whether you default to drain-and-rotate with redundancy, and know live patching tools and their limits.',
    answer: [
      "My default approach is redundancy and rotation: take one host out of scheduling and load balancing, move its containers to healthy hosts, patch and reboot it, verify it's healthy, then bring it back. This handles any patch, including ones that require a reboot, and it also proves your failover actually works.",
      "Kernel live-patching tools — Canonical Livepatch, kpatch, or a cloud provider's own offering — can apply some security fixes without a reboot, but not every patch qualifies for live patching. I check kernel and patch compatibility first, test it on a lower environment, monitor closely, and still schedule a periodic reboot onto a fully updated kernel.",
      "On a single host, you can't truly guarantee zero downtime for the application — the architecture needs another instance to fail over to.",
    ],
    followUps: [
      'How would you drain a Kubernetes node before patching it?',
      'How do you track which hosts are still waiting for a reboot?',
    ],
    tags: ['patching', 'kernel', 'availability'],
  },
  {
    id: 'itv-mydk-51',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What should you do when a Docker container exits immediately after startup?',
    probing:
      'Whether you read exit codes (0, 1, 126/127, 137), inspect config and logs, and fix the cause instead of tail -f /dev/null.',
    answer: [
      'I check `docker ps -a` for the exit code, run `docker logs <container>`, and use `docker inspect` to look at the command, entrypoint, environment, mounts, health status, whether it was OOM-killed, and any runtime errors. Exit code 0 usually just means the main process finished normally — a container only stays running while its main process (PID 1) is still running.',
      'Exit code 1 usually points to an application or config error, 126/127 to a bad command or permissions problem, and 137 usually means it was killed — often by SIGKILL or an out-of-memory kill.',
      'I re-run the exact same image with the intended configuration in a safe environment, only overriding the entrypoint if I need to poke around for diagnosis.',
      'Common causes: a shell-form command that breaks signal handling, a wrong file path, a missing config value or secret, a CPU architecture mismatch, a bind mount accidentally hiding files that should be there, a permissions error, a failed dependency, or the app trying to daemonize itself instead of staying in the foreground.',
      'Once I find the cause, I fix the image or deployment config, rebuild, and re-verify startup, health, logs, clean shutdown, and the restart policy. I never just run `tail -f /dev/null` to paper over a broken main process.',
    ],
    tags: ['troubleshooting', 'exit codes'],
  },
  {
    id: 'itv-mydk-52',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you debug slow Docker container startup?',
    probing:
      'Whether you measure image size, pull time and app init separately rather than guessing.',
    answer: [
      'Check the image size. Optimize the Dockerfile. Preload dependencies. Monitor entrypoint logs.',
      'I start by measuring rather than guessing. I check the image size and layer count, how much of the build hit cache, and how long the application itself takes to initialize.',
      "Common causes are a bloated image, dependencies being installed at container startup instead of build time, slow registry pulls, or the application doing heavy work (like loading large files or connecting to slow dependencies) before it's ready to serve traffic.",
      'Once I find the bottleneck, I fix the Dockerfile — usually with multi-stage builds and better layer ordering — rebuild, and confirm startup time actually improved.',
    ],
    tags: ['troubleshooting', 'performance'],
  },
  {
    id: 'itv-mydk-53',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you roll back a failed deployment in Docker and Kubernetes?',
    probing:
      'Whether you rely on versioned images for Docker and know kubectl rollout history/undo/status.',
    answer: [
      'If a deployment using a new image fails, you can roll back by running a container from the previous working image instead.',
      'Always version your images (for example, `myapp:v1`, `myapp:v2`) so you can revert easily.',
    ],
    code: [
      {
        title: 'Run the previous working version',
        language: 'bash',
        code: `docker run -d -p 8080:80 <image_name>:<previous_tag>
docker tag <image_name>:<previous_tag> <image_name>:stable   # tag a stable version`,
      },
      {
        title: 'Rollback in Kubernetes',
        language: 'bash',
        code: `kubectl rollout history deployment <deployment_name>              # Check rollout history
kubectl rollout undo deployment <deployment_name>                 # Rollback to the previous revision
kubectl rollout undo deployment <deployment_name> --to-revision=2 # Rollback to a specific revision
kubectl rollout status deployment <deployment_name>
kubectl get pods -o wide`,
      },
    ],
    tags: ['rollback', 'kubernetes'],
  },
  {
    id: 'itv-mydk-54',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Quick triage: the app works locally but not in Docker, the image is huge, or the container keeps restarting. What do you check?',
    probing: 'Whether you have a checklist per symptom rather than restarting and hoping.',
    answer: [
      "- **Works locally but not in Docker:** compare configuration, files, CPU architecture, dependencies, the port the app listens on, filesystem permissions, DNS/network setup, and logs.\n- **Large image:** check layers, the build context, cache ordering, the base image, leftover package caches, and whether a multi-stage build would help.\n- **Frequent restarts:** check the exit code, whether it was OOM-killed, health status, logs, configuration, dependencies, and resource limits.\n- **Persistent data:** use a named volume or an external datastore with backups — never rely on the container's writable layer.\n- **Multi-container communication:** use a user-defined network and reach other containers by name, not by a fixed IP address.",
      'In each case I gather evidence first (exit code, logs, inspect output, metrics) and change one thing at a time.',
    ],
    followUps: [
      'How would you tell an OOM kill apart from the app exiting on its own?',
      'Why does an app that binds to 127.0.0.1 work locally but not from outside the container?',
    ],
    tags: ['troubleshooting', 'checklist'],
  },
]
