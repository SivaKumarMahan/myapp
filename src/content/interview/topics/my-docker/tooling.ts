import type { InterviewQuestion } from '../../../types'

/** Docker Compose, running multi-container apps in production, and Docker Bake. */
export const myDockerToolingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mydk-30',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Docker Compose and why would you use it?',
    probing:
      'Whether you know Compose models services/networks/volumes in one file, that depends_on is not readiness, and that it is single-host.',
    answer: [
      'Docker Compose describes a multi-container application — its services, networks, volumes, environment variables, and dependencies — in one YAML file, and runs it with `docker compose`.',
      "It's great for local development, integration tests, and small single-host setups. Note that `depends_on` only waits for the container to start, not for the database inside it to actually be ready — you still need a health check or a retry loop for that.",
      'For production running across multiple nodes, an orchestrator like Kubernetes or ECS is normally what handles scheduling, high availability, secrets, and scaling.',
      "Docker Compose is mainly a single-host tool for local development. For running containers across multiple hosts — with scheduling, networking, health checks, and failover — use an orchestrator like Kubernetes, or Docker Swarm where it's specifically supported.",
      '**Why use Docker Compose:** the key reasons are:',
      '- You define application services and their build options — networks, volumes, environment variables — in one `docker-compose.yml`.\n- All services share the same network and can talk to each other internally (front-end, API, DB services, etc.).\n- You build and run every service with a single command: `docker-compose up` (or `docker compose up` with Compose v2).\n- Because the whole application is one config file, it is easy to share, store in version control (GitHub), and wire into a CI/CD pipeline.',
    ],
    code: [
      {
        title: 'Minimal compose file',
        language: 'yaml',
        code: `services:
  api:
    build: .
    ports: ["8080:8080"]
    depends_on: [db]
  db:
    image: postgres:16
    volumes: ["dbdata:/var/lib/postgresql/data"]
volumes: { dbdata: {} }`,
      },
    ],
    tags: ['compose'],
  },
  {
    id: 'itv-mydk-31',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Walk me through a multi-container Flask + Postgres app with Docker Compose.',
    probing:
      'Whether you can build a realistic compose file with a healthcheck-gated dependency, a named volume and credentials kept out of the file.',
    answer: [
      'This example runs two containers — a Postgres database and a Flask web app that talks to it.',
      'What each file is for:',
      '- **Dockerfile** — builds the web application image (a Flask/gunicorn image; see the `docker init` question for a representative Python Dockerfile).\n- **app.py** — the Flask code. It initializes SQLAlchemy, sets the PostgreSQL connection URI, defines a data model with `id` and `name` columns, and defines routes on `/` handling both GET and POST to store and render data.\n- **requirements.txt** — the application dependencies (Flask, Flask-SQLAlchemy, the Postgres driver, gunicorn, etc.).\n- **docker-compose.yml** — the Compose config file.\n- **templates/index.html** — the HTML for the Flask app.\n- **static/css/style.css** — the CSS.',
      'The `docker-compose.yml` defines two services, `app` and `db`, on the same network, with these characteristics: `app` port 5000 is exposed to host port 5000 and `db` port 5432 to host port 5432; `app` depends on `db`; a health check on `db` ensures Postgres is ready before `app` connects; a named volume persists the database; and environment variables hold the Postgres credentials and database name.',
      'Normally you should **not** hardcode credentials in the config file. If you would rather not write Compose files by hand, use `docker init` to generate them.',
      '**Running the application:** on a local machine, access the app at `http://localhost:5000` (`127.0.0.1`). On an EC2 instance with a public IP, use that IP on port 5000. You can connect to the Postgres DB from pgAdmin or a DB viewer. Because the database uses a named volume, data persists across `docker-compose down` / `docker-compose up`.',
      '**Installing Docker and Docker Compose:** Docker Desktop is the easiest option locally (it installs both Docker and Compose). On a cloud Linux VM such as an Amazon Linux 2 EC2 instance, install them with the commands in the samples.',
      '**Using environment variables for credentials:** instead of hardcoding credentials in `docker-compose.yml`, use a `.env` file. Create a `.env` in the same location as `docker-compose.yml`, remove the environment values from the Compose file, and put them in `.env`. Compose loads it automatically on `docker-compose up`.',
      'One problem: if you commit your code to GitHub, a `.env` in the repo exposes the credentials. Keep the secrets file out of the repo (e.g. `.gitignore` it) and pass a dedicated env file explicitly with `--env-file`.',
    ],
    code: [
      {
        title: 'Folder structure',
        language: 'bash',
        code: `mkdir docker-compose
cd docker-compose
# create files/directory to store the code
touch docker-compose.yml requirements.txt app.py Dockerfile
mkdir -p static/css
touch static/css/style.css
mkdir templates
touch templates/index.html`,
      },
      {
        title: 'docker-compose.yml',
        language: 'yaml',
        code: `services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:latest
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:`,
      },
      {
        title: 'Running the application',
        language: 'bash',
        code: `git clone https://github.com/akhileshmishrabiz/Devops-zero-to-hero
cd Devops-zero-to-hero/AWS-Projects/multi-container-app-docker-compose

docker-compose up --build

# data persists across restarts thanks to the named volume
docker-compose down
docker-compose up`,
      },
      {
        title: 'docker ps output',
        language: 'text',
        code: `$ docker ps
CONTAINER ID  IMAGE                              COMMAND                  STATUS                 PORTS                    NAMES
7c99c9539298  flask-app-docker-compose-app       "python app.py"          Up About a minute      0.0.0.0:5000->5000/tcp   flask-app-docker-compose-app-1
78f6a230ca24  postgres:latest                    "docker-entrypoint.s…"   Up About a minute (healthy)  0.0.0.0:5432->5432/tcp   flask-app-docker-compose-db-1`,
      },
      {
        title: 'Install Docker (Amazon Linux 2)',
        language: 'bash',
        code: `sudo yum update -y
sudo yum install docker -y
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -a -G docker ec2-user
# Log out and back in to run docker without sudo`,
      },
      {
        title: 'Install Docker Compose',
        language: 'bash',
        code: `sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
# Check the installation
docker-compose version`,
      },
      {
        title: 'Pass a dedicated env file',
        language: 'bash',
        code: 'docker-compose --env-file db-variables.env up',
      },
    ],
    tags: ['compose', 'postgres', 'secrets'],
  },
  {
    id: 'itv-mydk-32',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you run multi-container applications in production without Compose?',
    probing:
      'Whether you move to an orchestrator and cover discovery, identity, managed data, secrets, rollout, policy and DR.',
    answer: [
      'I use an orchestrator such as Kubernetes, ECS, or AKS. Each component gets its own image, its own Deployment or task definition, a way for other services to find it, its own configuration and identity, and its own scaling, health, and resource settings.',
      'The delivery pipeline publishes signed, fixed images, and then Helm, plain manifests, or GitOps declares how the application should run. Databases usually run as a managed service rather than as a container, and secrets come from a dedicated secret manager.',
      "I make sure there's redundancy, health probes, a rolling or canary rollout strategy, network policies, monitoring, logging, backups, and a disaster recovery plan. Compose is a good way to model services locally, but production needs a real cluster scheduler and the operational pieces around it.",
    ],
    followUps: [
      'How would you translate a compose file into Kubernetes manifests or a Helm chart?',
      'Why would you run the database as a managed service rather than a container?',
    ],
    tags: ['orchestration', 'kubernetes', 'production'],
  },
  {
    id: 'itv-mydk-33',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Docker Bake and what problem does it solve?',
    probing:
      'Whether you know Bake as "docker build as code" on BuildKit, and why declarative, versioned build config beats long shell commands.',
    answer: [
      'Docker Bake is a build orchestration tool (GA with Docker Desktop 4.38) that lets you define build stages and configuration in a declarative file instead of memorizing long `docker build` commands and flags.',
      'It leverages BuildKit\'s parallelization and optimization to speed up builds — think of it as "docker build as code," versioned like Terraform templates.',
      '**The problem it solves:** building and pushing images for a monorepo means repeating long commands with many flags. Those are just commands — not version-controlled, and easy to get wrong.',
      '**Bake it instead:** create a `docker-bake.hcl` at the repo root, then build both images with one command, and push with `--push`. Commit `docker-bake.hcl` to Git and nobody needs to remember `docker build` flags again.',
    ],
    code: [
      {
        title: 'The long-hand way',
        language: 'bash',
        code: `# Frontend build
docker build --build-arg NODE_VERSION=20 -t \\
  <account-id>.dkr.ecr.ap-south-1.amazonaws.com/frontend:latest \\
  -f frontend/frontend.Dockerfile frontend

# Backend build
docker build --build-arg GO_VERSION=1.21 -t \\
  <account-id>.dkr.ecr.ap-south-1.amazonaws.com/backend:latest \\
  -f backend/backend.Dockerfile backend

# Push both
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/frontend:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/backend:latest`,
        placeholders: ['<account-id>'],
      },
      {
        title: 'docker-bake.hcl',
        language: 'hcl',
        code: `group "default" {
  targets = ["frontend", "backend"]
}

target "frontend" {
  context    = "./frontend"
  dockerfile = "frontend.Dockerfile"
  args = {
    NODE_VERSION = "20"
  }
  tags = ["<account-id>.dkr.ecr.ap-south-1.amazonaws.com/frontend:latest"]
}

target "backend" {
  context    = "./backend"
  dockerfile = "backend.Dockerfile"
  args = {
    GO_VERSION = "1.21"
  }
  tags = ["<account-id>.dkr.ecr.ap-south-1.amazonaws.com/backend:latest"]
}`,
        placeholders: ['<account-id>'],
      },
      {
        title: 'Build and push with Bake',
        language: 'bash',
        code: `docker buildx bake          # build all targets in the default group
docker buildx bake --push   # build and push to the remote (e.g. ECR) repositories`,
      },
    ],
    tags: ['bake', 'buildkit', 'tooling'],
  },
  {
    id: 'itv-mydk-34',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain Docker Bake targets and groups.',
    probing:
      'Whether you can map docker build flags onto a target and build several targets at once with a group.',
    answer: [
      'A **target** represents a single build invocation — it holds everything you would normally pass to `docker build` via flags. The `docker build` command in the sample is equivalent to the Bake target below it.',
      '- Build a specific target by name: `docker buildx bake myapp`.\n- With no target argument, Bake builds the `default` target.',
      '**Groups:** group targets with the `group` block to build several at once.',
      '- Build multiple named targets: `docker buildx bake webapp api tests`.\n- Build a whole group: `docker buildx bake all`.',
    ],
    code: [
      {
        title: 'A docker build command',
        language: 'bash',
        code: `docker build \\
  -f Dockerfile \\
  -t myapp:latest \\
  --build-arg foo=bar \\
  --no-cache \\
  --platform linux/amd64,linux/arm64 \\
  .`,
      },
      {
        title: 'The equivalent Bake target',
        language: 'hcl',
        code: `target "myapp" {
  context    = "."
  dockerfile = "Dockerfile"
  tags       = ["myapp:latest"]
  args = {
    foo = "bar"
  }
  no-cache  = true
  platforms = ["linux/amd64", "linux/arm64"]
}`,
      },
      {
        title: 'Default target',
        language: 'hcl',
        code: `target "default" {
  dockerfile = "webapp.Dockerfile"
  tags       = ["docker.io/username/webapp:latest"]
  context    = "https://github.com/username/webapp"
}`,
      },
      {
        title: 'Groups',
        language: 'hcl',
        code: `group "all" {
  targets = ["webapp", "api", "tests"]
}

target "webapp" {
  dockerfile = "webapp.Dockerfile"
  tags       = ["docker.io/username/webapp:latest"]
  context    = "https://github.com/username/webapp"
}

target "api" {
  dockerfile = "api.Dockerfile"
  tags       = ["docker.io/username/api:latest"]
  context    = "https://github.com/username/api"
}

target "tests" {
  dockerfile = "tests.Dockerfile"
  contexts = {
    webapp = "target:webapp",
    api    = "target:api",
  }
  output  = ["type=local,dest=build/tests"]
  context = "."
}`,
      },
    ],
    tags: ['bake', 'buildkit'],
  },
  {
    id: 'itv-mydk-35',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do inheritance, variables, expressions and functions work in Docker Bake?',
    probing:
      'Whether you can keep a large Bake file DRY with inherits, variables, ternaries and functions, and debug it with --print.',
    answer: [
      '**Inheritance:** define common configuration once and reuse it across targets with `inherits`. An inheriting target can override any inherited attribute.',
      '**Variables (like Terraform):** define variables to set values, interpolate them, and do arithmetic. Print the resolved configuration (with interpolated values) using `docker buildx bake --print`.',
      '**Arithmetic and ternary expressions** and **built-in and user-defined functions**: use functions (e.g. a user-defined `generate_tag` plus the built-in `timestamp()`) to build values dynamically. A user-defined function must be declared with a `function` block.',
      '**Remote and alternate Bake files:**',
      '- You can build Bake files directly from a remote Git repository or HTTPS URL.\n- Bake files can be written in **HCL**, **YAML** (Docker Compose files), or **JSON**.\n- The filename is not fixed — pass any file with `--file`.',
      'By default Bake looks up its configuration file in a defined lookup order (e.g. `docker-bake.hcl`, `docker-bake.json`, `docker-compose.yml`, etc.).',
    ],
    code: [
      {
        title: 'Inheritance',
        language: 'hcl',
        code: `target "common" {
  context   = "."
  platforms = ["linux/amd64", "linux/arm64"]
}

target "backend" {
  inherits   = ["common"]
  dockerfile = "backend.Dockerfile"
  args = {
    GO_VERSION = "1.21"
  }
}

target "frontend" {
  inherits   = ["common"]
  dockerfile = "frontend.Dockerfile"
  args = {
    NODE_VERSION = "20"
  }
}`,
      },
      {
        title: 'Overriding an inherited value',
        language: 'hcl',
        code: `target "base" {
  context    = "."
  dockerfile = "Dockerfile"
  args = {
    APP_ENV = "development"
  }
}

target "production" {
  inherits = ["base"]
  args = {
    APP_ENV = "production"  # overrides the inherited value
  }
}`,
      },
      {
        title: 'Variables',
        language: 'hcl',
        code: `group "default" {
  targets = ["frontend"]
}

variable "NODE_VERSION" {
  default = "20"
}

variable "tag" {
  default = "latest"
}

target "frontend" {
  context    = "."
  dockerfile = "frontend.Dockerfile"
  args = {
    NODE_VERSION = NODE_VERSION
  }
  tags = ["myapp-frontend:\${tag}"]
}`,
      },
      {
        title: 'Arithmetic and ternary expressions',
        language: 'hcl',
        code: `variable "FOO" {
  default = 3
}

variable "IS_FOO" {
  default = true
}

target "app" {
  args = {
    v1 = FOO > 5 ? "higher" : "lower"
    v2 = IS_FOO ? "yes" : "no"
  }
}`,
      },
      {
        title: 'User-defined and built-in functions',
        language: 'hcl',
        code: `# Define a variable for version
variable "APP_VERSION" {
  default = "1.0.0"
}

# User-defined function
function "generate_tag" {
  params = [version]
  result = "v\${version}"
}

# Define a target using a custom function and a built-in function
target "myapp" {
  context    = "."
  dockerfile = "Dockerfile"
  tags       = ["myapp:\${generate_tag(APP_VERSION)}"]
  args = {
    BUILD_DATE = timestamp()
  }
}`,
      },
      {
        title: 'Print and alternate files',
        language: 'bash',
        code: `docker buildx bake --print
docker buildx bake --file ../docker/bake.hcl`,
      },
    ],
    followUps: [
      'How would you wire a Bake file into a CI pipeline with a commit-SHA tag variable?',
      'When would you use a Compose file as the Bake definition instead of HCL?',
    ],
    tags: ['bake', 'buildkit', 'hcl'],
  },
]
