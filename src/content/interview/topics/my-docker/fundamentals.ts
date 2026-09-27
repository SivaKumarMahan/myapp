import type { InterviewQuestion } from '../../../types'

/** Docker core model, containers vs VMs, lifecycle, networking, volumes and everyday commands. */
export const myDockerFundamentalsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mydk-1',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Docker, and why did it become necessary?',
    probing:
      'Whether you can explain images, containers, the daemon and kernel sharing in plain words, and why this beat hand-built servers and VMs.',
    answer: [
      'Docker is a containerization platform. It packages an application together with its dependencies, libraries, and configuration into a portable **image**, which then runs as an isolated **container**.',
      "Containers share the host machine's kernel instead of booting a full guest operating system, using two Linux features — namespaces for isolation and cgroups for resource limits. That's what makes them lightweight and able to start in milliseconds. It also solves the classic \"works on my machine\" problem, because the same image runs the same way everywhere, from a developer's laptop to production.",
      '**Why Docker:** 20–30 years ago you had hardware with an installed operating system, and to run an application you compiled the code and resolved all dependencies by hand. Needing another application or more capacity meant buying new hardware and doing fresh installation and configuration.',
      'Virtualization added a layer between hardware and OS — the hypervisor — letting you run multiple isolated virtual machines, each with its own OS. But you still had to install software and dependencies on every VM, and applications were not portable: they worked on some machines and not others.',
      'In simple terms, Docker is a way to package software so it can run on any machine (Windows, Mac, Linux). It made microservice-based application development practical by giving each service a consistent, portable runtime.',
      '**Core model:** Docker packages an application and its runtime dependencies into an image, then starts isolated container processes from that image. The CLI talks to the Docker daemon, which builds images, manages containers, volumes, and networks, and pulls or pushes them through registries.',
      "An image is a stack of layers that never changes once it's built. A container adds one more layer on top that it can write to, but that writable layer is thrown away when the container is removed. Anything that needs to survive belongs in a volume or an external service, not in the container itself.",
      '**How Docker works:** the Docker Engine runs on top of the host operating system and includes a server process (`dockerd`) that manages containers on the host. Three concepts to understand:',
      '- **Dockerfile** — a blueprint to build a Docker image.\n- **Docker image** — a template for running containers; it contains all the dependencies needed to execute the code inside a container.\n- **Docker container** — just a running process. One image can spin up many containers, in many places, and can be easily shared with anyone.',
    ],
    tags: ['fundamentals', 'images', 'containers'],
  },
  {
    id: 'itv-mydk-2',
    level: 'basic',
    kind: 'open',
    prompt: 'How is Docker useful and how do you use it in a pipeline?',
    probing:
      'Whether you connect containers to consistency, density and immutable releases, and can describe the build-test-scan-push-deploy flow.',
    answer: [
      '- **Consistency:** the same image runs in CI, staging, and production.\n- **Isolation and density:** you can run many containers on one host, each with its resource usage capped by cgroups.\n- **Fast, reliable deploys:** once an image is built and tagged, that exact build never changes — you ship an image tag, and rolling back just means re-deploying the previous tag.\n- **In a pipeline:** build the image, run unit and integration tests inside it, scan it for vulnerabilities (with a tool like Trivy or Grype), push it to a registry (like ECR or GHCR) under a fixed tag, then deploy it to Kubernetes or ECS. Multi-stage builds keep the final image small and free of build tools.',
      'Docker comes up constantly in pipeline work because it gives every stage the same artifact to test and promote.',
    ],
    tags: ['ci/cd', 'fundamentals'],
  },
  {
    id: 'itv-mydk-3',
    level: 'basic',
    kind: 'open',
    prompt: 'Can Docker containers be used as CI/CD agents?',
    probing:
      'Whether you know ephemeral container agents in Jenkins, GitLab and GitHub Actions and why they beat long-lived build servers.',
    answer: [
      'Yes — this is standard practice:',
      "- **Jenkins:** the Docker and Kubernetes plugins spin up a fresh container for each build. You get a clean, reproducible environment that's thrown away afterward.\n- **GitLab CI:** each job runs inside a container defined by `image:`.\n- **GitHub Actions:** `container:` runs job steps inside a container, and you can also run service containers alongside it.",
      'The benefits are isolation, reproducibility, no "snowflake" build agents that drift out of sync, and easy control over which tool versions each job uses.',
    ],
    tags: ['ci/cd', 'agents'],
  },
  {
    id: 'itv-mydk-4',
    level: 'basic',
    kind: 'open',
    prompt: 'Docker versus virtual machines: what is the difference?',
    probing:
      'Whether you understand kernel sharing versus hardware emulation and do not oversell containers as a full security boundary.',
    answer: [
      "A virtual machine emulates hardware and runs a full guest operating system on top of a hypervisor. That gives strong isolation, but at the cost of more startup time and overhead. A container isolates a process while sharing the host's kernel, so it starts fast and packs application dependencies much more densely.",
      "Containers don't replace every security boundary a VM gives you. Production security still relies on a hardened host, namespaces and cgroups for isolation, non-root users, tools like seccomp and AppArmor, verified image provenance, and orchestration-level policy. In practice, containers are usually run on top of VMs in cloud environments anyway.",
    ],
    tags: ['fundamentals', 'virtualization'],
  },
  {
    id: 'itv-mydk-5',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the lifecycle of a Docker container?',
    probing:
      'Whether you know create/start/stop/rm, that PID 1 keeps the container alive, and how SIGTERM then SIGKILL shapes shutdown.',
    answer: [
      "An image is built or pulled. `docker create` sets up a container's writable layer and configuration without starting it. `docker start` runs the configured process. From there it can pause, restart, or stop. `docker rm` deletes the container entirely. Any data written to the container's writable layer disappears when it's removed, so anything you need to keep must live in a volume or an external service.",
      "The container stays alive only as long as its main process (PID 1) is running. `docker stop` sends SIGTERM, waits a bit, then sends SIGKILL if the process hasn't exited — so your application needs to handle that signal and shut down cleanly.",
      "When something fails, I check the container's exit code and state, whether it was killed for using too much memory, its logs, events, configuration, mounts, network, and health status — before I just restart it and hope.",
    ],
    code: [
      {
        title: 'Container lifecycle',
        language: 'bash',
        code: `docker pull nginx:1.27
docker create --name web nginx:1.27
docker start web
docker logs web
docker stop web
docker rm web`,
      },
    ],
    tags: ['lifecycle', 'containers'],
  },
  {
    id: 'itv-mydk-6',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key commands for running, entering and removing containers?',
    probing:
      'Hands-on fluency with run flags, ps, exec, stop/start and rm, and understanding that the first run pulls the image.',
    answer: [
      'Docker must be installed first. On Linux, use your package manager; on Mac/Windows, install Docker Desktop.',
      'These spin up two containers from the minimalist public images `alpine` and `busybox` (stored on Docker Hub):',
      '- `-d` runs the container detached (in the background).\n- `-t` attaches a TTY terminal to it.\n- `--name` names the container (a random name is assigned if omitted).',
      'The first `docker run` with a given image pulls it from Docker Hub to the local machine. Linux images are small compared to full distributions like Ubuntu, Amazon Linux, or CentOS.',
      '**Interacting with containers:** `docker exec` runs a command inside a running container. `-it` opens an interactive session; the shell can be `sh`, `bash`, `zsh`, etc.',
    ],
    code: [
      {
        title: 'Getting started',
        language: 'bash',
        code: `docker run -d -t --name Thor alpine
docker run -d -t busybox

docker ps       # running containers
docker ps -a    # all containers (running and stopped)
docker image ls # images on the local machine`,
      },
      {
        title: 'Interacting with containers',
        language: 'bash',
        code: `# docker exec -it <container id> <shell>

docker exec -t Thor ls          # run a command in the container named Thor
docker exec -t 8ad10d1d0660 free -m   # check memory usage by container id

docker exec -it 16fb1c59fbea sh # interactive shell; type "exit" to leave`,
      },
      {
        title: 'Starting, stopping, and deleting containers',
        language: 'bash',
        code: `docker stop <container name or id>   # stop a running container
docker start <container name or id>  # start a stopped container

# remove: stop first, then rm
docker stop 16fb1c59fbea
docker rm 16fb1c59fbea

docker rm -f Thor  # or force-delete a running container`,
      },
    ],
    tags: ['commands', 'containers'],
  },
  {
    id: 'itv-mydk-7',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you list running containers and all containers, including stopped ones?',
    probing:
      'Whether you know ps vs ps -a, useful filters/format strings, and treat exited containers as evidence.',
    answer: [
      '`docker ps` (or `docker container ls`) shows running containers. `docker ps -a` (or `docker container ls --all`) also shows containers that were created, exited, or are dead. I usually add formatting or filters to make the output more useful.',
      "The status and exit code tell me what to check next. I look at `docker inspect`, `docker logs`, and any application or host metrics before restarting or deleting anything — an exited container can hold evidence you'll need to figure out what actually went wrong.",
    ],
    code: [
      {
        title: 'Formatting and filtering docker ps',
        language: 'bash',
        code: `docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'
docker ps -a --filter status=exited`,
      },
    ],
    tags: ['commands', 'containers'],
  },
  {
    id: 'itv-mydk-8',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you enter a running Docker container from the command line?',
    probing:
      'Whether you prefer exec over attach, cope with shell-less images, and treat live patching inside a container as an anti-pattern.',
    answer: [
      'I check what shell the container actually has, then use `docker exec` — not `docker attach` — for normal investigation.',
      "`exec` starts a brand-new process inside the container. `attach` connects directly to the container's main process, and typing into it or hitting Ctrl+C can accidentally send a signal that disrupts the app.",
      'A minimal or distroless production image may have no shell at all. In that case, I check logs, metadata, and mounts from the host or with approved debugging tools instead of trying to modify the image from inside.',
      "Access to the Docker socket is effectively root access to the whole host, so it's restricted and audited. If something needs fixing, I don't patch it live inside the container — I fix the Dockerfile or configuration, build a new image, redeploy it, and verify the fix.",
    ],
    code: [
      {
        title: 'Entering a container',
        language: 'bash',
        code: `docker ps
docker exec -it <container-name> /bin/sh
# Use /bin/bash only when the image contains Bash.`,
      },
    ],
    tags: ['commands', 'debugging'],
  },
  {
    id: 'itv-mydk-9',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you copy a file from a container to the host?',
    probing:
      'Knowing docker cp both ways, and that copying into a running container is debugging, not configuration management.',
    answer: [
      "The container can be running or stopped. I check the path, permissions, free disk space, and whether the file might contain secrets or personal data before copying it. For logs or data that's actively being written, a plain copy can catch it mid-write — use the application's own export or snapshot feature when that matters.",
      'Copying a file into a running container is a debugging move, not a way to manage configuration — the change disappears the moment the container is replaced. Anything that needs to stick around belongs in the image, a config file, or a volume, deployed properly.',
    ],
    code: [
      {
        title: 'docker cp both directions',
        language: 'bash',
        code: `docker cp mycontainer:/var/log/app/error.log ./error.log
docker cp ./config.yaml mycontainer:/tmp/config.yaml`,
      },
    ],
    tags: ['commands', 'files'],
  },
  {
    id: 'itv-mydk-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are cgroups, and how do they relate to namespaces in Docker?',
    probing:
      'Whether you separate "what a container can see" (namespaces) from "how much it can use" (cgroups), and know OOM kill vs CPU throttling.',
    answer: [
      'Cgroups are a Linux feature that tracks and limits how much CPU, memory, process count, and I/O a group of processes can use. Container runtimes use cgroups for resource limits, while a separate feature, namespaces, handles isolating what a container can see — its own processes, network, and mounts.',
      "Docker's flags translate directly into cgroup settings (see the sample).",
      "Go over the memory limit and the container gets killed (an OOM kill); go over the CPU limit and it just gets throttled. I check `docker stats`, the container's state and exit code, host resource pressure, and cgroup metrics when something looks wrong. Limits protect the host, but they should be based on real measurements — set them too low and the app becomes unstable for no good reason.",
      "Docker uses two Linux kernel features to isolate containers: namespaces, which give each container its own view of processes, mounts, and networking, and cgroups, which limit how much CPU, memory, and other resources it can use. A container is still just a process sharing the host's kernel, so run it as a non-root user, drop capabilities it doesn't need, and keep the host itself hardened.",
    ],
    code: [
      {
        title: 'Resource limits map to cgroups',
        language: 'bash',
        code: 'docker run --memory=512m --cpus=1.5 --pids-limit=200 app',
      },
    ],
    tags: ['cgroups', 'namespaces', 'resources'],
  },
  {
    id: 'itv-mydk-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What Docker network types exist, and which is common in production?',
    probing:
      'Whether you know bridge/host/none/overlay/macvlan, why a user-defined bridge gives DNS, and that orchestrators bring their own networking.',
    answer: [
      "The common Docker network drivers are `bridge` for single-host container networking, `host` for sharing the host's own network stack directly, `none` for no networking at all, and `overlay` for multi-host networking under Swarm. `macvlan` and `ipvlan` can put containers directly on the physical network, but they add real operational complexity.",
      'A user-defined bridge network is a sensible default for local or single-host work, since it gives you both DNS-based service discovery and isolation.',
      "In production, platforms like Kubernetes and ECS usually bring their own networking layer (a CNI plugin or VPC networking) instead of exposing Docker's raw network types directly. The right choice comes down to isolation needs, service discovery, policy requirements, observability, and how failures should be contained.",
      '**1. Default bridge.** When you run, say, an nginx container, the web server listens on port 80 inside the container. From inside the container `curl 127.0.0.1:80` returns the page (`127.0.0.1` is the loopback address for localhost), but you cannot reach it from the host by default.',
      'The default bridge network does not expose container services automatically — you must forward ports — and it does **not** provide internal DNS name resolution, so containers can reach each other by IP but not by name. **Port forwarding** publishes a container port to a host port.',
      '**2. User-defined bridge network.** Docker recommends creating your own network rather than using the default bridge. It provides isolation from the host network and name resolution between containers (they still need port forwarding to be reached from the host). Containers on `blog-network` can now ping each other by name (e.g. `ping nginx-con`).',
      "**3. Host network.** The container shares the host's network stack directly. The container has no IP of its own — it uses the host machine's IP.",
      '**Multi-container communication:** use a user-defined network and reach other containers by name, not by a fixed IP address.',
    ],
    code: [
      {
        title: 'Inspect the default bridge and forward a port',
        language: 'bash',
        code: `docker inspect nginx-container
docker network ls
docker network inspect bridge

# docker run -d -p <host port>:<container port> --name <container name> <image>
docker run -t -d -p 5000:80 --name nginx-container nginx:latest`,
      },
      {
        title: 'User-defined bridge network',
        language: 'bash',
        code: `docker network create blog-network
docker run -itd --network blog-network --name nginx-con nginx
docker network inspect blog-network
docker inspect nginx-con`,
      },
      {
        title: 'Host network',
        language: 'bash',
        code: `docker run -td --network host --name nginx-server nginx:latest
docker inspect nginx-server | grep IPAddress`,
      },
    ],
    tags: ['networking'],
  },
  {
    id: 'itv-mydk-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Docker volumes and bind mounts, and when would you use each?',
    probing:
      'Whether you pick named volumes for persistent data, bind mounts for dev/config, know -v vs --mount syntax, and plan backups.',
    answer: [
      "A named volume is managed by Docker and is the right choice for data a container needs to keep. A bind mount points at a specific path on the host — handy for local development or config files, but it ties the container tightly to the host's folder layout and permissions.",
      "For anything persistent, I plan backup, restore, ownership, encryption, and capacity up front. Removing a container doesn't automatically remove its volume. In an orchestrated environment I use the platform's own persistent volumes rather than assuming a local Docker volume gives high availability.",
      "Docker isolates a container's content from your local filesystem, so deleting a container deletes everything inside it. To persist data a container generates, use volumes.",
      "- **Bind mount** — a file or directory on the host machine is mounted into a container.\n- **Docker volume** — a location on your filesystem managed by Docker. It does not increase the size of the containers using it, and its contents live outside any single container's lifecycle.",
      'There are two syntaxes:',
      '- **`-v` / `--volume`** — three colon-separated fields: (1) host path (bind mount) or volume name, (2) mount path in the container, (3) optional comma-separated options such as `ro`, `z`, `Z`.\n- **`--mount`** — comma-separated key-value pairs: `type` (`bind`, `volume`, or `tmpfs`), `source`, and `target` (the mount path in the container).',
      "**Example — shared named volume across containers.** Note: `-v <name>:/path` (no leading `/`) creates a **named volume**, not a true bind mount (a bind mount requires an absolute host path like `-v /host/dir:/app/log`). That is why the shared data is not visible on the host filesystem — it lives in Docker-managed storage. Logs written under `/app/log` in any of these containers are visible to all of them. Inspect a container's `Mounts` section for details with `docker inspect hulk`.",
      '**Example — Docker volumes.** Mount a volume when creating containers (with `--mount`, `type` defaults to `volume` when the source is a volume name). Both containers share the data written under `/app`.',
      "**Persistent data:** use a named volume or an external datastore with backups — never rely on the container's writable layer.",
    ],
    code: [
      {
        title: 'Named volume vs bind mount',
        language: 'bash',
        code: `docker volume create dbdata
docker run -v dbdata:/var/lib/postgresql/data postgres
docker run --mount type=bind,src="$PWD/config",dst=/app/config,readonly app`,
      },
      {
        title: 'Shared named volume across containers',
        language: 'bash',
        code: `mkdir docker-bind-mount
docker run -t -d -v docker-bind-mount:/app/log --name captain-america busybox
docker run -t -d -v docker-bind-mount:/app/log --name thor busybox
docker run -t -d -v docker-bind-mount:/app/log --name hulk busybox
docker run -t -d -v docker-bind-mount:/app/log --name iron-man alpine

# equivalent with --mount (a name as source means a named volume)
docker run -t -d --mount type=volume,source=docker-bind-mount,target=/app/log \\
  --name captain-america busybox

docker inspect hulk`,
      },
      {
        title: 'Creating and mounting Docker volumes',
        language: 'bash',
        code: `docker volume create thor-vol
docker volume create hulk-vol
docker volume ls
docker volume inspect thor-vol

docker run -d \\
  --name thor-container \\
  --mount type=volume,source=thor-vol,target=/app \\
  nginx:latest

docker run -d \\
  --name hulk-container \\
  --mount source=thor-vol,target=/app \\
  nginx:latest

docker volume rm <volume-name> [<volume-name>...]`,
      },
    ],
    tags: ['volumes', 'storage'],
  },
  {
    id: 'itv-mydk-13',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between docker export and docker save?',
    probing:
      'Whether you know export flattens a container filesystem and loses image metadata, and that a registry beats passing tarballs.',
    answer: [
      "`docker export` saves a container's filesystem but throws away the image's layers and metadata. Use `docker save` and `docker load` instead when you need to move an image around.",
      'Better yet, push to an authenticated registry rather than passing tar files by hand.',
    ],
    tags: ['images', 'commands'],
  },
]
