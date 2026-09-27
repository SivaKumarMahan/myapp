import type { InterviewQuestion } from '../../../types'

/** Writing Dockerfiles and images: instructions, layering, multi-stage builds, size and build-time config. */
export const myDockerDockerfileQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mydk-14',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Dockerfile instructions and what does each one do?',
    probing:
      'Whether you know every common instruction and the gotchas: ARG is not for secrets, EXPOSE does not publish, ADD has hidden behaviour.',
    answer: [
      "- `FROM`: picks the base image and starts a build stage.\n- `LABEL`: adds metadata.\n- `ARG`: a build-time value — never use it to hold a secret.\n- `ENV`: sets a default environment variable, baked into the image and at runtime.\n- `WORKDIR`: sets (and creates) the working directory.\n- `COPY`: copies files from the build context; the default choice for copying.\n- `ADD`: does what `COPY` does, plus it can extract local archives and fetch some remote sources — use it only when you actually need that behavior.\n- `RUN`: runs a command during the build and creates a layer.\n- `EXPOSE`: documents which port the container listens on; it doesn't publish that port to the host.\n- `VOLUME`: declares a mount point, but who owns and manages that volume should still be explicit.\n- `USER`: sets which user later steps and the running container use; production should normally run as non-root.\n- `HEALTHCHECK`: reports container health, but keep the check itself lightweight and meaningful.\n- `ENTRYPOINT`: the main program the container runs; `CMD`: its default arguments, or a default command on its own.\n- `ONBUILD`: queues up an instruction to run later, when this image is used as someone else's base. Use it carefully — that behavior is invisible in the child Dockerfile.",
      'Good defaults: a small, trusted, pinned base image; a `.dockerignore` file; copying dependency files before source code so the cache works well; multi-stage builds; one clear main process; the exec form of commands; a non-root user; a read-only filesystem where possible; limited capabilities and resources; secrets injected at runtime, not baked in; scanning; an SBOM; signing; and rebuilding regularly.',
    ],
    tags: ['dockerfile'],
  },
  {
    id: 'itv-mydk-15',
    level: 'basic',
    kind: 'open',
    prompt:
      'What is the base image in Docker and which base image would you use for Python or Node.js?',
    probing:
      'Whether you understand the base image as the first layer and can choose slim/alpine variants sensibly.',
    answer: [
      'A **base image** is the starting point of your Docker image — the first layer everything else is built on top of. Your app, its dependencies, and your configuration all get added on top of it. It defines the runtime environment your app needs, such as the operating system and libraries.',
      '- For Python, use `python:3.x-slim` or `python:3.x-alpine`.\n- For Node.js, use `node:18-slim` or `node:18-alpine`.',
    ],
    code: [
      {
        title: 'Using a Python base image',
        language: 'dockerfile',
        code: `FROM python:3.10-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]`,
      },
      {
        title: 'Using a Node.js base image',
        language: 'dockerfile',
        code: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]`,
      },
    ],
    tags: ['dockerfile', 'base image'],
  },
  {
    id: 'itv-mydk-16',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between ADD and COPY in a Dockerfile?',
    probing:
      'Whether you default to COPY for auditability and know ADD auto-extracts tarballs and fetches URLs.',
    answer: [
      '`COPY` copies local files or directories from the build context into the image. `ADD` does that too, but also has extra behavior — it can automatically extract local tar archives and fetch some remote URLs. I prefer `COPY` because its behavior is obvious just by reading it, which makes the Dockerfile easier to audit.',
      "For remote files, I'd rather download them in a controlled `RUN` step with TLS and a checksum check, or fetch them before the build starts. A strict `.dockerignore` file keeps large or sensitive files out of the build context in the first place.",
      "Neither `COPY` nor `ADD` should ever pull in `.git`, local credentials, or build output you don't need.",
    ],
    code: [
      {
        title: 'COPY only what you need',
        language: 'dockerfile',
        code: 'COPY package.json package-lock.json ./',
      },
    ],
    tags: ['dockerfile'],
  },
  {
    id: 'itv-mydk-17',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What is the difference between RUN, CMD, and ENTRYPOINT (and between CMD and ENTRYPOINT)?',
    probing:
      'Build-time vs run-time, how docker run arguments override CMD but not ENTRYPOINT, and why exec form matters for signals.',
    answer: [
      '- `RUN` runs during the build and creates a new image layer.\n- `ENTRYPOINT` sets the main command the container runs.\n- `CMD` provides default arguments (or a default command) that are easy to override at runtime.',
      'Running `docker run image --port 9090` overrides the `CMD` arguments while keeping the `ENTRYPOINT`. I always use the JSON/exec array form rather than a plain shell string, so the app runs directly as PID 1 and receives shutdown signals correctly. A shell-form command inserts an extra shell process in between, which can interfere with signal handling.',
      '**CMD vs ENTRYPOINT:** `ENTRYPOINT` makes the container behave like a specific program. `CMD` supplies the default arguments (or command) for it. Arguments you pass on `docker run` replace `CMD`, but replacing `ENTRYPOINT` requires the `--entrypoint` flag.',
      'For a general-purpose tool image, `CMD` alone is often more flexible. I avoid wrapper shell scripts unless they end with `exec "$@"`, so signals still reach the actual application instead of being swallowed by the wrapper. I also test `docker stop` directly to confirm the container shuts down cleanly.',
    ],
    code: [
      {
        title: 'RUN, ENTRYPOINT and CMD together',
        language: 'dockerfile',
        code: `RUN apt-get update && apt-get install -y --no-install-recommends curl \\
 && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/local/bin/myapp"]
CMD ["--port", "8080"]`,
      },
      {
        title: 'Application image: ENTRYPOINT plus default CMD',
        language: 'dockerfile',
        code: `ENTRYPOINT ["/app/server"]
CMD ["--config", "/etc/server/config.yaml"]`,
      },
    ],
    tags: ['dockerfile', 'entrypoint', 'signals'],
  },
  {
    id: 'itv-mydk-18',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How many CMD instructions can a Dockerfile contain, and what happens when there are multiple?',
    probing:
      'Whether you know only the last CMD of the final stage wins, and how to verify the effective config.',
    answer: [
      'A Dockerfile can technically contain multiple `CMD` instructions, but only the last one in the final build stage actually takes effect — the earlier ones are silently overwritten, and having more than one usually just makes the Dockerfile confusing to read.',
      "Each stage of a multi-stage build can define its own `CMD`, but only the final stage's configuration matters at runtime.",
      'I normally use one exec-form `ENTRYPOINT` for the actual program and one exec-form `CMD` for its default arguments.',
      'Arguments passed to `docker run image ...` replace `CMD`; the `--entrypoint` flag is needed to replace `ENTRYPOINT` itself. The exec form keeps signal handling working correctly, which matters for a clean shutdown. I confirm the final result with `docker image inspect` and by actually testing `docker stop`.',
    ],
    code: [
      {
        title: 'One ENTRYPOINT, one CMD',
        language: 'dockerfile',
        code: `ENTRYPOINT ["java", "-jar", "/app/app.jar"]
CMD ["--spring.profiles.active=prod"]`,
      },
    ],
    tags: ['dockerfile', 'entrypoint'],
  },
  {
    id: 'itv-mydk-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What happens when you write COPY . in a Dockerfile?',
    probing:
      'Whether you think about build context, .dockerignore, cache invalidation and secrets leaking into layers.',
    answer: [
      "It copies the entire build context — everything in that directory except what `.dockerignore` excludes — into the image. That can pull in source code, Git history, credentials, test data, and large files you didn't mean to include. It also means any small change anywhere in that directory invalidates the build cache for that layer.",
      'A strict `.dockerignore` file plus copying only what you need, in the right order, avoids this.',
      "I check the build context size, build logs, and image layers (using `docker history` or a tool like Dive) to catch anything that shouldn't be there. If a secret ever ends up in a layer, deleting it in a later layer isn't enough — the old layer still has it in the image's history. The fix is to rotate the secret and rebuild from a clean history.",
    ],
    code: [
      {
        title: 'Copy selectively, in cache-friendly order',
        language: 'dockerfile',
        code: `COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src`,
      },
    ],
    tags: ['dockerfile', 'build context', 'cache'],
  },
  {
    id: 'itv-mydk-20',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain Docker image layering and how it can cause cache busting.',
    probing:
      'Whether you understand that a changed layer invalidates everything after it, and balance caching against pulling patched bases.',
    answer: [
      "Most Dockerfile instructions create a new layer, and each layer's build cache depends on the layers before it plus its own inputs.",
      'If `COPY . .` happens before you install dependencies, changing even one source file invalidates that layer and every layer after it — so dependencies get reinstalled from scratch every time.',
      'A better order is shown in the sample.',
      'Put the steps that change often (like copying source code) later in the file, and pin your dependencies. I do deliberately refresh the base image on a schedule with `--pull`, so security patches still get in even though the cache is otherwise "sticky."',
      "Caching makes builds faster, but I don't let a stale cache block a needed patch. `docker history` and build timing help spot exactly where cache is being invalidated.",
    ],
    code: [
      {
        title: 'Dependencies before source',
        language: 'dockerfile',
        code: `COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src`,
      },
    ],
    tags: ['layers', 'cache', 'dockerfile'],
  },
  {
    id: 'itv-mydk-21',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you create a custom Docker image?',
    probing:
      'Whether your flow goes beyond docker build to .dockerignore, pinning, testing, scanning, versioned tags and BuildKit secrets.',
    answer: [
      'I write a Dockerfile, add a `.dockerignore` file, pin a trusted base image, then build, test, scan, and publish a versioned image.',
      'I check that tests pass, that the app starts correctly, which user it runs as, what files are in the image, its size and layer count, how it handles shutdown, and its scan results. Credentials should never go into build arguments or image layers — if a private dependency truly needs a credential during the build, use a BuildKit secret mount instead, which keeps it out of the final image and its history.',
    ],
    code: [
      {
        title: 'Dockerfile',
        language: 'dockerfile',
        code: `FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
USER 10001
EXPOSE 8080
CMD ["python", "app.py"]`,
      },
      {
        title: 'Build, run, scan, push',
        language: 'bash',
        code: `docker build --pull -t registry.example.com/app:abc123 .
docker run --rm -p 8080:8080 registry.example.com/app:abc123
trivy image --severity HIGH,CRITICAL registry.example.com/app:abc123
docker push registry.example.com/app:abc123`,
      },
    ],
    tags: ['images', 'dockerfile', 'build'],
  },
  {
    id: 'itv-mydk-22',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you build an image for a Flask app and push it to Docker Hub?',
    probing:
      'Basic fluency with build, tag with a namespace/repo:tag, login, push, pull and run with a port mapping.',
    answer: [
      'Build a Docker image containing a basic Flask app and push it to Docker Hub. Create three files: `Dockerfile`, `app.py` and `requirements.txt` (containing `Flask`).',
      'Build, tag, and push. Then delete the local image, pull it back from Docker Hub, and run a container from it.',
    ],
    code: [
      {
        title: 'app.py',
        language: 'python',
        code: `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_docker():
    return 'Hello, Docker!'

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')`,
      },
      {
        title: 'Dockerfile',
        language: 'dockerfile',
        code: `# Use an official Python runtime as a parent image
FROM python:3.11

# Work inside /app
WORKDIR /app

# Copy the Python dependency file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Flask app file into the container at /app
COPY app.py .

# Make port 5000 available outside this container
EXPOSE 5000

# Run app.py when the container launches
CMD ["python", "app.py"]`,
      },
      {
        title: 'Build, tag, push, pull and run',
        language: 'bash',
        code: `touch Dockerfile app.py requirements.txt

# docker build -t <image-name> <path to Dockerfile>
docker build -t flask-image .

# docker tag <local image> <docker hub username>/<repository name>:<tag>
docker tag flask-image livingdevopswithakhilesh/docker-demo-docker:1.0

docker login
docker push livingdevopswithakhilesh/docker-demo-docker:1.0

docker pull livingdevopswithakhilesh/docker-demo-docker:1.0
docker run -td -p 8080:5000 --name flask livingdevopswithakhilesh/docker-demo-docker:1.0`,
      },
    ],
    tags: ['images', 'registry', 'build'],
  },
  {
    id: 'itv-mydk-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you write a production-ready Dockerfile?',
    probing:
      'Whether you combine multi-stage, pinning, cache order, non-root, exec form and testing under production restrictions.',
    answer: [
      "I use multi-stage builds so compilers and build dependencies never end up in the runtime image. I pin an approved base image, install only what's needed, copy dependency files before the source code so the build cache works well, and run as a non-root user.",
      'I use the exec form of `ENTRYPOINT`/`CMD` (the `["cmd", "arg"]` array style, not a shell string), a `.dockerignore` file, no secrets baked in, as few writable paths as possible, labels and an SBOM, and vulnerability scanning. Health checking is mostly the orchestrator\'s job, not the image\'s.',
      "I also test the image under the same restrictions it'll run under in production — non-root, read-only filesystem, and resource limits.",
    ],
    code: [
      {
        title: 'Multi-stage Node build served by nginx',
        language: 'dockerfile',
        code: `FROM node:20-alpine AS build
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build

FROM nginx:1.27-alpine
COPY --from=build /src/dist /usr/share/nginx/html
USER 101`,
      },
    ],
    tags: ['dockerfile', 'production', 'multi-stage'],
  },
  {
    id: 'itv-mydk-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Docker multi-stage builds, and how do they help optimize Docker images?',
    probing:
      'Whether you can explain separating build and runtime environments and quantify the size/security win.',
    answer: [
      'Multi-stage builds let you separate the build environment from the runtime environment. In the first stage, you compile or package your app using all the tools you need. In the final stage, you copy just the build output into a lightweight image, like Alpine.',
      "This makes images much smaller, more secure, and faster to deploy. For example, I've taken a 900MB Go build image down to under 50MB using multi-stage builds.",
      "- The first stage uses the `golang` image to compile the application.\n- The second stage uses the lightweight `alpine` image and copies over only the compiled binary.\n- The result is a much smaller final image that contains only what's needed to run the app.",
      'A multi-stage Dockerfile compiles and tests the app in a stage that has all the build tools, then copies just the runtime output into a small final image. This keeps the image smaller, reduces its attack surface, and keeps compilers, source code, and dependency caches out of production.',
    ],
    code: [
      {
        title: 'Multi-stage Go build',
        language: 'dockerfile',
        code: `# Stage 1: Build the application
FROM golang:1.20 AS builder
WORKDIR /app
COPY . .
RUN go build -o myapp .   # Compiles your Go app into a single executable binary called myapp.

# Stage 2: Create a lightweight runtime image
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/myapp .   # Copies only the compiled binary from the first stage.
CMD ["./myapp"]`,
      },
    ],
    tags: ['multi-stage', 'image size'],
  },
  {
    id: 'itv-mydk-25',
    level: 'advanced',
    kind: 'open',
    prompt: 'Write and explain a multi-stage Dockerfile for a Maven application.',
    probing:
      'Whether you can write it from memory with BuildKit cache mounts, a JRE-only runtime, a non-root user and dependency caching.',
    answer: [
      'The build stage has Maven, the source code, and everything needed to compile. The runtime stage only has a JRE and the final JAR — nothing else carries over. Copying `pom.xml` in before the source code means dependency downloads stay cached across builds.',
      "A `.dockerignore` file excludes `.git`, local build output, credentials, and anything else that doesn't belong in the build context. In production, I'd pin the base images by digest, scan and sign the result, set sensible JVM and container resource limits, and test that shutdown signals and health checks both work.",
    ],
    code: [
      {
        title: 'Multi-stage Maven Dockerfile',
        language: 'dockerfile',
        code: `# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B test package

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 appuser
WORKDIR /app
COPY --from=build --chown=appuser:appuser /src/target/*.jar app.jar
USER 10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]`,
      },
    ],
    followUps: [
      'How would you pick JVM heap settings so the container is not OOM-killed?',
      'How would you pin these base images by digest and keep them patched?',
    ],
    tags: ['multi-stage', 'java', 'buildkit'],
  },
  {
    id: 'itv-mydk-26',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you optimize a Dockerfile for performance and security?',
    probing:
      'Whether you cover build speed, supply chain and runtime hardening together, and measure instead of cargo-culting Alpine.',
    answer: [
      "I start from a small, trusted, pinned base image, use multi-stage builds, lock dependency versions, order instructions so the cache works well, use BuildKit cache mounts, add a `.dockerignore` file, run as non-root, install only what's needed, use exec-form commands, and never bake in secrets. Package caches are cleaned up in the same layer they were created in, and I avoid leaving unnecessary shells or tools in the runtime image.",
      'CI builds the image reproducibly, tests it, generates an SBOM, scans it, signs it, and publishes a fixed, versioned build. At runtime I add a read-only root filesystem, drop capabilities, apply seccomp, set resource limits, and restrict network access where the app allows it.',
      'I measure build time, cache hit rate, image size, startup time, vulnerability count, and actual application performance. Alpine isn\'t automatically the best choice — its different C library (musl) can cause subtle compatibility issues, so a "slim" or distroless image is sometimes the safer bet.',
    ],
    followUps: [
      'How do BuildKit cache mounts differ from ordinary layer caching?',
      'When would you choose distroless over slim or Alpine?',
    ],
    tags: ['dockerfile', 'security', 'performance'],
  },
  {
    id: 'itv-mydk-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you reduce Docker image size for faster deployments?',
    probing:
      'Whether you know cleanup must happen in the same layer, multi-stage helps most, and fewer layers is not the goal in itself.',
    answer: [
      '- Use a smaller base image, like Alpine.\n- Use multi-stage builds.\n- Remove unused packages and cache in the same layer you added them.\n- Push to a private registry so pulls are fast and cached.',
      'I start from a small, trusted base image and use multi-stage builds so build tools and source code never end up in the final image — only the compiled output does.',
      "I keep the number of packages installed to a minimum, and I clean up package caches in the same `RUN` step that installs them, since a later `RUN rm` doesn't shrink earlier layers. I also order instructions so that things which change often (like application source) come after things that rarely change (like dependency installs), so builds stay fast.",
      'Alpine isn\'t always the right choice — sometimes its different C library (musl) causes compatibility issues, so a "slim" or distroless image can be a safer trade-off.',
      "Keep images small. Use a minimal, approved base image, multi-stage builds, a `.dockerignore` file, and pinned dependency versions. Only include what the app needs to run — no build tools, build cache, or secrets in the final image. Having fewer layers isn't the goal by itself; what matters is ordering layers so the build cache works well, and checking that the image still works and passes its vulnerability scan.",
      '**Large image checklist:** check layers, the build context, cache ordering, the base image, leftover package caches, and whether a multi-stage build would help.',
    ],
    tags: ['image size', 'optimization'],
  },
  {
    id: 'itv-mydk-28',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you pass environment values during Docker builds, where should runtime configuration live, and what services store Docker images?',
    probing:
      'Whether you separate non-secret build args from runtime config and secrets, promote one image, and know the main registries.',
    answer: [
      'You can pass a value into the build using `--build-arg` with `docker build`. Here, `APP_ENV` is passed in at build time and set as an environment variable inside the container.',
      "Build arguments (`ARG`) should only ever be used for non-secret build choices, because their values can end up in the image's history, build cache metadata, or provenance record. Runtime `ENV` sets defaults baked into the image, and those can still be overridden by environment variables or mounted config at deploy time.",
      'If a build genuinely needs a secret — say, to pull a private dependency — use a BuildKit secret mount, not `ARG`. Better still, fetch secrets at runtime through workload identity and a secret manager.',
      'I never bake separate Dev, UAT, and Prod credentials into separate images. I build one image, publish it under a fixed digest to the approved registry, and supply environment-specific but non-secret configuration through Kubernetes ConfigMaps, platform settings, or orchestrator variables. Actual secret values come from Vault, Key Vault, Secrets Manager, or an external-secret integration, scoped to only the access they need and rotated regularly.',
      "I check `docker history`, the image's configuration, CI logs, the SBOM and provenance record, and registry access to make sure nothing sensitive leaked out. If a credential ever does end up in a layer, deleting the file later isn't enough — I rotate it immediately and rebuild without it.",
      '**Storing Docker images:** you can store Docker images in a container registry. Some popular options:',
      '1. **Docker Hub** — a widely used public registry for storing and sharing images.\n2. **Amazon Elastic Container Registry (ECR)** — a managed registry on AWS.\n3. **Google Artifact Registry** (successor to the deprecated Google Container Registry, GCR) — a private registry on Google Cloud.\n4. **Azure Container Registry (ACR)** — a private registry on Microsoft Azure.\n5. **Harbor** — an open-source registry with built-in security and identity features.\n6. **JFrog Artifactory** — a general-purpose artifact repository that also supports Docker images.',
      'Pick a registry based on how well it fits your cloud provider, its security features, and how well it scales.',
    ],
    code: [
      {
        title: 'Dockerfile with a build argument',
        language: 'dockerfile',
        code: `FROM alpine:latest
ARG APP_ENV
ENV APP_ENV=\${APP_ENV}
RUN echo "Building for environment: $APP_ENV"
CMD ["sh", "-c", "echo Running in environment: $APP_ENV"]`,
      },
      {
        title: 'Build command',
        language: 'bash',
        code: 'docker build --build-arg APP_ENV=production -t myapp:latest .',
      },
    ],
    tags: ['build args', 'configuration', 'registry'],
  },
  {
    id: 'itv-mydk-29',
    level: 'basic',
    kind: 'open',
    prompt: 'What is docker init and how do you use it?',
    probing:
      'Awareness of the scaffolding command, what files it generates, and the best practices baked into its Dockerfile.',
    answer: [
      "`docker init` is a command-line utility that helps initialize Docker resources within a project. It creates a Dockerfile, a Compose file, and a `.dockerignore` based on the project's requirements, simplifying Docker configuration and reducing complexity.",
      'It supports Go, Python, Node.js, Rust, ASP.NET, PHP, and Java, and is available with Docker Desktop.',
      '**How to use it:** go to your project directory, then run `docker init`. It scans the project, asks you to confirm the best-matching template, and prompts for project-specific information (language/platform, version, port, entrypoint) before generating the Docker assets. You can accept the recommended defaults or provide your own values.',
      'Example — a basic Flask app: create `app.py` and a `requirements.txt` containing `Flask`, then run `docker init` and choose Python as the application platform. It suggests recommended values (Python version, port, entrypoint) and generates the config files along with instructions for running the application.',
      '**Generated Dockerfile:** the auto-generated Dockerfile follows performance and security best practices — pinned slim base, non-root user, cache/bind mounts for dependency install, and an explicit exposed port.',
      'It also generates a `compose.yaml` to run the app (with database service config commented out — uncomment it, add a local secrets file, and run if you need a database) and a `.dockerignore` file.',
      '**Why use it:** `docker init` makes dockerization easy, especially for newcomers. It eliminates the manual task of writing Dockerfiles and other configuration files, saving time and minimizing errors, and uses templates that follow industry best practices to tailor the setup to your application type. Note: at the time of writing, `docker init` is available with Docker Desktop.',
    ],
    code: [
      {
        title: 'app.py',
        language: 'python',
        code: `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_docker():
    return '<h1> hello world </h1>'

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')`,
      },
      {
        title: 'Generated Dockerfile',
        language: 'dockerfile',
        code: `# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.11.7
FROM python:\${PYTHON_VERSION}-slim as base

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

# Keeps Python from buffering stdout and stderr to avoid situations where
# the application crashes without emitting any logs due to buffering.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Create a non-privileged user that the app will run under.
ARG UID=10001
RUN adduser \\
    --disabled-password \\
    --gecos "" \\
    --home "/nonexistent" \\
    --shell "/sbin/nologin" \\
    --no-create-home \\
    --uid "\${UID}" \\
    appuser

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.cache/pip to speed up subsequent builds.
# Leverage a bind mount to requirements.txt to avoid having to copy it into this layer.
RUN --mount=type=cache,target=/root/.cache/pip \\
    --mount=type=bind,source=requirements.txt,target=requirements.txt \\
    python -m pip install -r requirements.txt

# Switch to the non-privileged user to run the application.
USER appuser

# Copy the source code into the container.
COPY . .

# Expose the port that the application listens on.
EXPOSE 5000

# Run the application.
CMD gunicorn 'app:app' --bind=0.0.0.0:5000`,
      },
    ],
    tags: ['docker init', 'tooling'],
  },
]
