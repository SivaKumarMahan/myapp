import type { Analysis, Finding } from './types'

/**
 * A Dockerfile linter. Parses the instructions (with `\` continuations and
 * multi-stage builds) and checks them against the rules that come up in
 * every container review.
 */

export interface Instruction {
  keyword: string
  args: string
  /** 1-based line where the instruction starts. */
  line: number
  stage: number
}

export interface Stage {
  name: string | null
  image: string
  tag: string | null
  digest: string | null
  line: number
}

export interface DockerfileFacts {
  stages: Stage[]
  instructions: string[]
  finalUser: string | null
  healthcheck: boolean
  hasCmd: boolean
  exposes: string[]
}

export function parseDockerfile(text: string): { instructions: Instruction[]; stages: Stage[] } {
  const instructions: Instruction[] = []
  const stages: Stage[] = []
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length) {
    const start = i
    let raw = lines[i]
    // Comments and parser directives are not instructions.
    if (/^\s*(#|$)/.test(raw)) {
      i += 1
      continue
    }
    while (/\\\s*$/.test(raw) && i + 1 < lines.length) {
      i += 1
      const next = lines[i]
      if (/^\s*#/.test(next)) continue
      raw = raw.replace(/\\\s*$/, ' ') + next.trim()
    }
    i += 1
    const match = /^\s*([A-Za-z]+)\s*(.*)$/.exec(raw)
    if (!match) continue
    const keyword = match[1].toUpperCase()
    const args = match[2].trim()
    if (keyword === 'FROM') {
      const parts = args.split(/\s+/).filter((part) => !part.startsWith('--'))
      const reference = parts[0] ?? ''
      const name = parts[1]?.toUpperCase() === 'AS' ? (parts[2] ?? null) : null
      const [withoutDigest, digest] = reference.split('@')
      const lastSlash = withoutDigest.lastIndexOf('/')
      const colon = withoutDigest.indexOf(':', lastSlash + 1)
      stages.push({
        name,
        image: colon >= 0 ? withoutDigest.slice(0, colon) : withoutDigest,
        tag: colon >= 0 ? withoutDigest.slice(colon + 1) : null,
        digest: digest ?? null,
        line: start + 1,
      })
    }
    instructions.push({ keyword, args, line: start + 1, stage: Math.max(0, stages.length - 1) })
  }
  return { instructions, stages }
}

const SECRET =
  /(pass(word|wd)?|secret|token|api[_-]?key|client[_-]?secret|connection[_-]?string|access[_-]?key|private[_-]?key|credentials?)/i
const BUILD_TOOLS =
  /\b(npm (ci|install|run build)|yarn (install|build)|pnpm (install|build)|dotnet (publish|build|restore)|go build|mvn (package|install)|gradle\w* (build|assemble)|cargo build|pip install|tsc\b)/
const SDK_IMAGE =
  /(sdk|golang|maven|gradle|rust|node(?!.*(slim|alpine|distroless))|python(?!.*(slim|alpine)))/

/** A multi-stage version of the build, for the toolchain the file uses. */
function multiStageFix(run: string): string {
  if (/dotnet/.test(run)) {
    return 'FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build\nWORKDIR /src\nCOPY *.csproj ./\nRUN dotnet restore\nCOPY . .\nRUN dotnet publish -c Release -o /app\n\nFROM mcr.microsoft.com/dotnet/aspnet:8.0\nWORKDIR /app\nCOPY --from=build /app .\nUSER $APP_UID\nENTRYPOINT ["dotnet", "Api.dll"]'
  }
  if (/go build/.test(run)) {
    return 'FROM golang:1.23 AS build\nWORKDIR /src\nCOPY go.* ./\nRUN go mod download\nCOPY . .\nRUN CGO_ENABLED=0 go build -o /app ./cmd/server\n\nFROM gcr.io/distroless/static-debian12:nonroot\nCOPY --from=build /app /app\nENTRYPOINT ["/app"]'
  }
  if (/pip/.test(run)) {
    return 'FROM python:3.12 AS build\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir --prefix=/install -r requirements.txt\n\nFROM python:3.12-slim\nCOPY --from=build /install /usr/local\nCOPY . /app\nWORKDIR /app\nUSER 1000\nCMD ["python", "main.py"]'
  }
  return 'FROM node:20 AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine\nWORKDIR /app\nCOPY --from=build /app/dist ./dist\nCOPY --from=build /app/node_modules ./node_modules\nUSER node\nCMD ["node", "dist/server.js"]'
}

export function analyseDockerfile(text: string): Analysis<DockerfileFacts> {
  const { instructions, stages } = parseDockerfile(text)
  const findings: Finding[] = []
  const add = (finding: Finding) => findings.push(finding)

  if (stages.length === 0) {
    add({
      rule: 'DF000',
      severity: 'error',
      title: 'No FROM',
      message: 'A Dockerfile starts from a base image: FROM <image>:<tag>.',
      line: 1,
    })
    return {
      findings,
      facts: {
        stages,
        instructions: instructions.map((x) => x.keyword),
        finalUser: null,
        healthcheck: false,
        hasCmd: false,
        exposes: [],
      },
    }
  }
  const stageNames = new Set(stages.map((stage) => stage.name?.toLowerCase()).filter(Boolean))
  const finalStage = stages.length - 1
  const final = instructions.filter((instruction) => instruction.stage === finalStage)

  // Base images: a tag, and not :latest.
  for (const stage of stages) {
    if (stage.image === 'scratch' || stageNames.has(stage.image.toLowerCase()) || stage.digest)
      continue
    if (!stage.tag || stage.tag === 'latest') {
      add({
        rule: 'DF001',
        severity: 'error',
        title: stage.tag ? `${stage.image}:latest` : `${stage.image} has no tag`,
        message: `${stage.tag ? ':latest' : 'No tag means :latest, which'} changes whenever the image is republished, so the same Dockerfile builds something different next week. Pin a version (and, for production, a digest).`,
        line: stage.line,
        fix: {
          snippet: `FROM ${stage.image}:<version>${stage.name ? ` AS ${stage.name}` : ''}\n# e.g. FROM node:20-alpine, or pin exactly: FROM node:20-alpine@sha256:<digest>`,
          language: 'dockerfile',
        },
      })
    }
  }

  // Who the container runs as.
  const users = final.filter((instruction) => instruction.keyword === 'USER')
  const finalUser = users.length > 0 ? users[users.length - 1].args : null
  const finalImage = stages[finalStage]
  const nonRootBase = /nonroot|distroless.*nonroot|chainguard/i.test(
    `${finalImage.image}:${finalImage.tag ?? ''}`,
  )
  if ((!finalUser && !nonRootBase) || /^(root|0)(:|$)/.test(finalUser ?? '')) {
    add({
      rule: 'DF002',
      severity: 'warning',
      title: 'Runs as root',
      message:
        'With no USER (or USER root), the process runs as root inside the container. A break-out or a mounted volume then has root behind it. Create and switch to an unprivileged user.',
      line:
        users.length > 0
          ? users[users.length - 1].line
          : (final[final.length - 1]?.line ?? finalImage.line),
      fix: {
        snippet: /alpine/.test(finalImage.tag ?? '')
          ? 'RUN addgroup -S app && adduser -S app -G app\nUSER app'
          : 'RUN useradd --create-home --uid 10001 app\nUSER app\n# official node images already have a "node" user: USER node',
        language: 'dockerfile',
      },
    })
  }

  if (!final.some((instruction) => instruction.keyword === 'HEALTHCHECK')) {
    add({
      rule: 'DF003',
      severity: 'warning',
      title: 'No HEALTHCHECK',
      message:
        'Docker and Azure Container Apps / App Service cannot tell a hung container from a healthy one. (Kubernetes ignores HEALTHCHECK and uses probes instead.)',
      line: finalImage.line,
      fix: {
        snippet:
          'HEALTHCHECK --interval=30s --timeout=3s --retries=3 \\\n  CMD wget -qO- http://localhost:8080/health || exit 1',
        language: 'dockerfile',
      },
    })
  }

  const runs = instructions.filter((instruction) => instruction.keyword === 'RUN')
  for (const instruction of instructions) {
    const { keyword, args, line } = instruction
    if (keyword === 'ENV' || keyword === 'ARG') {
      const pairs =
        keyword === 'ENV' && !args.includes('=')
          ? [args.split(/\s+/, 2)]
          : args.split(/\s+(?=[A-Za-z_][\w]*=)/).map((pair) => pair.split('='))
      for (const [name, ...rest] of pairs) {
        const value = rest.join('=')
        if (name && SECRET.test(name) && (keyword === 'ARG' || value)) {
          add({
            rule: 'DF004',
            severity: keyword === 'ENV' && value ? 'error' : 'warning',
            title: `Secret in ${keyword} ${name}`,
            message: `${keyword} values are saved in the image${keyword === 'ARG' ? "'s build history" : ''} - anyone who can pull it can read them with docker history or docker inspect. Pass secrets at build time with a BuildKit secret mount, and at run time from the platform (Key Vault, Kubernetes secrets).`,
            line,
            fix: {
              snippet: `# build time:\nRUN --mount=type=secret,id=${name.toLowerCase()} \\\n    ${name}=$(cat /run/secrets/${name.toLowerCase()}) ./configure\n# docker build --secret id=${name.toLowerCase()},src=./${name.toLowerCase()}.txt .\n# run time: inject ${name} as an environment variable from Key Vault / a Kubernetes secret`,
              language: 'dockerfile',
            },
          })
        }
      }
    }
    if (keyword === 'RUN') {
      if (/apt-get (-\S+ )*install/.test(args)) {
        if (!/rm -rf \/var\/lib\/apt\/lists/.test(args)) {
          add({
            rule: 'DF005',
            severity: 'warning',
            title: 'apt-get without cleanup',
            message:
              'The package lists stay in the layer and add tens of MB to every image. Remove them in the same RUN - a later RUN cannot shrink an earlier layer.',
            line,
            fix: {
              snippet:
                'RUN apt-get update \\\n && apt-get install -y --no-install-recommends curl ca-certificates \\\n && rm -rf /var/lib/apt/lists/*',
              language: 'dockerfile',
            },
          })
        }
        if (!/--no-install-recommends/.test(args)) {
          add({
            rule: 'DF006',
            severity: 'info',
            title: 'apt-get install without --no-install-recommends',
            message:
              'Recommended packages are rarely needed in a container and make the image bigger.',
            line,
          })
        }
      }
      if (/apt-get update/.test(args) && !/apt-get (-\S+ )*install/.test(args)) {
        add({
          rule: 'DF007',
          severity: 'warning',
          title: 'apt-get update on its own',
          message:
            'Docker caches this layer, so later installs use a stale package list. Run update and install in the same RUN.',
          line,
        })
      }
      if (/apk add/.test(args) && !/--no-cache/.test(args)) {
        add({
          rule: 'DF008',
          severity: 'warning',
          title: 'apk add without --no-cache',
          message: 'Without --no-cache the package index stays in the image.',
          line,
          fix: { snippet: 'RUN apk add --no-cache curl', language: 'dockerfile' },
        })
      }
      if (/pip3? install/.test(args) && !/--no-cache-dir/.test(args)) {
        add({
          rule: 'DF009',
          severity: 'info',
          title: 'pip install keeps its cache',
          message: "pip's download cache is useless in an image. Add --no-cache-dir.",
          line,
          fix: {
            snippet: 'RUN pip install --no-cache-dir -r requirements.txt',
            language: 'dockerfile',
          },
        })
      }
      if (/(curl|wget)[^|]*\|\s*(ba|z)?sh/.test(args)) {
        add({
          rule: 'DF010',
          severity: 'warning',
          title: 'Piping a download into a shell',
          message:
            'Whatever that URL serves at build time runs as root in your image, unchecked. Download, verify a checksum, then run it - or use a package.',
          line,
        })
      }
      if (/(^|[;&|]\s*)sudo\s/.test(args)) {
        add({
          rule: 'DF011',
          severity: 'warning',
          title: 'sudo in RUN',
          message:
            'RUN already executes as the current USER; sudo adds a setuid binary and unpredictable behaviour. Switch USER instead.',
          line,
        })
      }
    }
    if (
      keyword === 'ADD' &&
      !/^(--\S+\s+)*(https?:\/\/|\S+\.(tar|tgz|tar\.gz|tar\.xz)\b)/.test(args)
    ) {
      add({
        rule: 'DF012',
        severity: 'warning',
        title: 'ADD instead of COPY',
        message:
          'ADD also extracts archives and downloads URLs, which makes it surprising. For plain files, COPY says exactly what happens.',
        line,
        fix: { snippet: `COPY ${args}`, language: 'dockerfile' },
      })
    }
    if (keyword === 'MAINTAINER') {
      add({
        rule: 'DF013',
        severity: 'info',
        title: 'MAINTAINER is deprecated',
        message: 'Use a label instead.',
        line,
        fix: {
          snippet: `LABEL org.opencontainers.image.authors="${args}"`,
          language: 'dockerfile',
        },
      })
    }
    if (
      (keyword === 'CMD' || keyword === 'ENTRYPOINT') &&
      instruction.stage === finalStage &&
      !args.startsWith('[')
    ) {
      add({
        rule: 'DF014',
        severity: 'warning',
        title: `${keyword} in shell form`,
        message:
          'Shell form runs your process under /bin/sh -c, which does not pass on SIGTERM - so the container ignores a graceful stop and is killed after the timeout. Use the JSON (exec) form.',
        line,
        fix: {
          snippet: `${keyword} [${args
            .split(/\s+/)
            .map((part) => JSON.stringify(part))
            .join(', ')}]`,
          language: 'dockerfile',
        },
      })
    }
    if (keyword === 'EXPOSE' && /\b22\b/.test(args)) {
      add({
        rule: 'DF015',
        severity: 'warning',
        title: 'SSH port exposed',
        message:
          'Running sshd in a container is rarely needed and widens the attack surface. Use docker exec / kubectl exec to get a shell.',
        line,
      })
    }
  }

  // Cache: copying everything before installing dependencies.
  for (const stageIndex of stages.keys()) {
    const inStage = instructions.filter((instruction) => instruction.stage === stageIndex)
    const copyAll = inStage.find(
      (instruction) =>
        instruction.keyword === 'COPY' &&
        /^(\S+\s+)*\.\s+\S+$/.test(instruction.args) &&
        !instruction.args.includes('--from'),
    )
    const install = inStage.find(
      (instruction) =>
        instruction.keyword === 'RUN' &&
        /(npm (ci|install)|yarn install|pip3? install -r|dotnet restore|go mod download|bundle install)/.test(
          instruction.args,
        ),
    )
    if (copyAll && install && copyAll.line < install.line) {
      add({
        rule: 'DF016',
        severity: 'warning',
        title: 'COPY . . before installing dependencies',
        message:
          'Every source change invalidates the cached dependency install, so each build reinstalls everything. Copy the dependency manifest first, install, then copy the rest.',
        line: copyAll.line,
        fix: { snippet: 'COPY package*.json ./\nRUN npm ci\nCOPY . .', language: 'dockerfile' },
      })
    }
  }

  // Building in the image you ship.
  const buildRun = runs.find((instruction) => BUILD_TOOLS.test(instruction.args))
  if (
    stages.length === 1 &&
    buildRun &&
    SDK_IMAGE.test(`${finalImage.image}:${finalImage.tag ?? ''}`)
  ) {
    add({
      rule: 'DF017',
      severity: 'warning',
      title: 'No multi-stage build',
      message:
        'The image you ship contains the whole build toolchain (SDK, compilers, dev dependencies): bigger, slower to pull and with more to patch. Build in one stage, copy only the output into a small runtime image.',
      line: buildRun.line,
      fix: { snippet: multiStageFix(buildRun.args), language: 'dockerfile' },
    })
  }

  const hasCmd = final.some(
    (instruction) => instruction.keyword === 'CMD' || instruction.keyword === 'ENTRYPOINT',
  )
  if (!hasCmd) {
    add({
      rule: 'DF018',
      severity: 'info',
      title: 'No CMD or ENTRYPOINT',
      message:
        "The container will run the base image's default command. Say what this image is for.",
      line: finalImage.line,
    })
  }

  return {
    findings,
    facts: {
      stages,
      instructions: instructions.map((instruction) => instruction.keyword),
      finalUser,
      healthcheck: final.some((instruction) => instruction.keyword === 'HEALTHCHECK'),
      hasCmd,
      exposes: instructions
        .filter((instruction) => instruction.keyword === 'EXPOSE')
        .flatMap((instruction) => instruction.args.split(/\s+/)),
    },
  }
}
