import type { InterviewQuestion } from '../../../types'

/** GitLab platform and GitLab CI/CD questions. */
export const myGitlabQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mygit-36',
    level: 'basic',
    kind: 'open',
    prompt: 'What is GitLab, and what does it include?',
    probing:
      'Whether you know what GitLab covers as a DevSecOps platform and what to check before adopting it.',
    answer: [
      'GitLab is a DevSecOps platform built around Git repository hosting. It also includes merge requests, issues, access control, CI/CD, runners, package and container registries, releases, and security scanning.',
      'You can use it as GitLab.com or run it self-managed. Organizations pick self-managed when they need control over network placement, upgrades, or data residency.',
      "A typical flow: a developer pushes a branch and opens a merge request. The pipeline runs tests and scans. Reviewers approve, and the change merges. The pipeline publishes an immutable artifact — one that is never changed after it's built, only replaced by a new version. A protected environment job then deploys it.",
      'Before choosing GitLab, I would still check runner security, backup and restore, identity integration, licensing, availability, and who owns it operationally.',
    ],
    tags: ['gitlab', 'basics'],
  },
  {
    id: 'itv-mygit-37',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a merge request in GitLab?',
    probing:
      'Whether you use merge requests as a governed review step with approval rules and an audit trail.',
    answer: [
      'A merge request proposes merging a source branch into a target branch. It brings together code review, discussion, pipeline results, approvals, and issue links, and ends with the merge decision.',
      'In the description, I write a clear problem statement, the solution, the risk, test evidence, deployment impact, and rollback notes. GitLab can enforce rules on top of this: Code Owner approval, a successful pipeline, resolved discussions, and no merge conflicts.',
      'I keep changes small enough to review properly. I mark a merge request as draft while the work is still incomplete.',
      "Before merging, I check the generated artifact or infrastructure plan if one exists. After merging, I verify the deployment worked and link the release back to the merge request, so there's a clear audit trail.",
    ],
    tags: ['gitlab', 'merge requests'],
  },
  {
    id: 'itv-mygit-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you protect branches in GitLab?',
    probing:
      'Whether you protect branches, tags and environments and test the controls with a normal account.',
    answer: [
      'I mark `main` and release branches as protected. That means I restrict who can push and merge, disallow force pushes, and require every change to go through a merge request. Approval rules force the right reviewers or Code Owners to sign off, and pipelines enforce tests, security scans, and policy checks.',
      'I also protect tags and deployment environments. If someone can create a production tag or trigger a deployment directly, they can bypass branch controls entirely. Emergency access is limited, logged, and reviewed afterward.',
      'I test the controls using a normal developer account: a direct push, a force push, an unauthorized merge, and access to protected variables should all fail. I also review access periodically and remove stale users and tokens.',
    ],
    tags: ['gitlab', 'protected branches'],
  },
  {
    id: 'itv-mygit-39',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do GitLab groups and projects help access management?',
    probing:
      'Whether you manage access through groups and subgroups with least privilege and regular reviews.',
    answer: [
      'Groups organize related projects and can contain subgroups. Membership and settings can be inherited from a group down to its projects, which makes it easier to manage teams consistently. Projects themselves contain repositories, pipelines, registries, issues, and their own permissions.',
      'I grant access through groups rather than to individual users, and I give each person the lowest role that still lets them do their job. I keep platform administration and application administration separate, and I create subgroups to mark different trust boundaries. A sensitive production project or runner should not inherit broad access just because its parent group has it.',
      'I review inherited permissions, deploy tokens, access tokens, runner scope, protected environments, and external collaborators on a regular basis. Ownership is documented, so every access request and removal has someone accountable for approving it.',
    ],
    tags: ['gitlab', 'groups', 'access'],
  },
  {
    id: 'itv-mygit-40',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage secrets in GitLab and GitLab CI?',
    probing:
      'Whether you use protected, masked variables or Vault/OIDC, and keep secrets away from unprotected pipelines.',
    answer: [
      'I store CI secrets as protected and masked CI/CD variables, or I fetch them at runtime from Vault or a cloud secret manager. Production secrets are limited to protected branches and tags, and to protected environments.',
      'File-type variables are useful when a tool needs a temporary credential file on disk.',
      'For cloud access, I prefer OIDC or workload identity so jobs get short-lived credentials instead of long-lived keys. I never echo variables to the log, turn on shell tracing around secret operations, or let secrets end up in artifacts or cache.',
      "Masking hides a value in the log output, but it's not the real security boundary — access control is.",
      'I test that unprotected branches and fork pipelines cannot reach production variables. If a value does leak, I revoke it first, check job logs and audit events, rotate the affected credentials, and remove any retained artifacts that might contain it.',
      "I use protected, masked CI/CD variables, or fetch secrets from Vault or a cloud secret manager during the job. For cloud authentication, I prefer GitLab's OIDC identity federation, so the job trades its identity token for short-lived credentials instead of holding a long-lived key. Controls I rely on:",
      '1. Production variables are only available to protected branches/tags and protected environments.\n2. Runners handling untrusted merge requests cannot reach production secrets.\n3. Shell tracing is turned off around any secret operation.\n4. Secrets never go into artifacts, cache, Docker image layers, or command-line arguments that would show up in a process list.\n5. Access, ownership, expiry, and rotation are all audited.',
      'If a secret shows up in a job log, I revoke it right away, check who could have read that log, rotate the related credentials, remove the retained output where I can, and fix the pipeline before running it again.',
    ],
    tags: ['gitlab', 'secrets', 'ci/cd variables'],
  },
  {
    id: 'itv-mygit-41',
    level: 'basic',
    kind: 'open',
    prompt: 'What are GitLab tags and releases used for?',
    probing:
      'Whether you know the difference between a Git tag and a GitLab Release and never move a published tag.',
    answer: [
      'A Git tag marks a specific commit, usually a version like `v1.4.0`. A GitLab Release wraps that tag with release notes, evidence, links, and assets.',
      'My pipeline builds an artifact once, records its commit SHA and checksum, and promotes that same immutable artifact through each environment rather than rebuilding it. Protected tags restrict who can trigger a release.',
      "I never move a tag that's already published. A correction ships as a new version instead.",
      'Release notes cover user-visible changes, migrations, known issues, deployment steps, and rollback information. After deployment, I check application health and keep enough artifact and pipeline evidence to reproduce exactly what reached production.',
    ],
    tags: ['gitlab', 'tags', 'releases'],
  },
  {
    id: 'itv-mygit-42',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you handle code review quality in GitLab?',
    probing:
      'Whether you combine process and automation to keep review quality high without slowing delivery.',
    answer: [
      'I combine process with automation:',
      '- Small merge requests with clear acceptance criteria\n- Code Owners required for security-sensitive or specialized areas\n- Required approvals, with the author blocked from approving their own change\n- Passing unit, integration, lint, security, and policy checks\n- Resolved discussions and tested migrations\n- Review checklists covering security, failure handling, observability, and rollback',
      'I ask reviewers to explain the risk in a change, not just point out style preferences. Recurring style issues get moved into a linter instead of repeated in review comments. I track review time, defect escape rate, and oversized merge requests. Adding more required approvals without improving review quality just slows delivery down.',
    ],
    tags: ['gitlab', 'code review'],
  },
  {
    id: 'itv-mygit-43',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you migrate a repository to GitLab?',
    probing:
      'Whether you can migrate a repository with full history, recreated controls, a final sync and a rollback plan.',
    answer: [
      'First I inventory everything: branches, tags, large files, submodules, issues, pull requests, webhooks, deploy keys, CI secrets, branch policies, packages, and integrations. To move the Git history itself, I mirror all references:',
      'I recreate permissions, protected branches and tags, runners, variables, and webhooks by hand rather than copying plaintext secrets across. If needed, I migrate issues and review history using supported import tools.',
      'Before cutover, I briefly freeze writes and run a final sync. I compare branch and tag counts and check important commit SHAs match. I test clone, push, merge, pipeline, and release operations on the new side, then switch DNS or repository URLs. The old repository stays read-only for an agreed period, and I keep a documented rollback plan ready.',
    ],
    code: [
      {
        title: 'Mirror all refs to GitLab',
        language: 'bash',
        code: `git clone --mirror <old-url> project.git
cd project.git
git push --mirror <gitlab-url>`,
      },
    ],
    followUps: [
      'What does git clone --mirror copy that a normal clone does not?',
      'How do you verify the migration is complete?',
    ],
    tags: ['gitlab', 'migration'],
  },
  {
    id: 'itv-mygit-44',
    level: 'basic',
    kind: 'open',
    prompt: 'What is GitLab CI/CD?',
    probing:
      'Whether you know what triggers GitLab pipelines and how stages, jobs and runners fit together.',
    answer: [
      'GitLab CI/CD runs automated workflows, defined mostly in `.gitlab-ci.yml`. A pipeline gets created by a commit, a merge request, a tag, a schedule, an API call, or a manual trigger. Each pipeline has stages and jobs, and GitLab Runners actually execute those jobs.',
      "I keep the pipeline definition in Git, use templates so I'm not repeating job configuration, protect production environments, use short-lived credentials, and make sure every artifact traces back to a commit. Monitoring and post-deployment checks are what actually confirm a deployment succeeded — a green pipeline on its own doesn't prove the application is healthy.",
    ],
    code: [
      {
        title: 'Production pipeline flow',
        language: 'text',
        code: `commit → build/test → code and dependency scans → image build/scan
       → publish immutable (not changed after creation) artifact → deploy staging → smoke test
       → production approval → deploy → verify/rollback`,
      },
    ],
    tags: ['gitlab ci', 'basics'],
  },
  {
    id: 'itv-mygit-45',
    level: 'basic',
    kind: 'open',
    prompt: 'What are stages, jobs, and runners in GitLab CI?',
    probing:
      'Whether you can define jobs, stages and runners and know how `needs` changes ordering.',
    answer: [
      '- A **job** is a unit of work, such as test or deploy, with a script, image, variables, and rules.\n- A **stage** groups jobs by logical order. Jobs in the same stage can run in parallel; later stages normally wait for earlier ones.\n- A **runner** is the agent that executes jobs using a shell, Docker, Kubernetes, or another executor.',
      "I tag runners by capability, keep protected runners isolated, patch them regularly, make sure they don't retain secrets between jobs, and autoscale where it makes sense. Using `needs`, a job can start as soon as its own dependencies finish, instead of waiting for the whole previous stage to complete.",
    ],
    code: [
      {
        title: 'Two stages, two jobs',
        language: 'yaml',
        code: `stages: [test, build]

unit-test:
  stage: test
  image: node:20-alpine
  script: ["npm ci", "npm test"]

build-image:
  stage: build
  script: ["docker build -t app:$CI_COMMIT_SHA ."]`,
      },
    ],
    tags: ['gitlab ci', 'stages', 'jobs', 'runners'],
  },
  {
    id: 'itv-mygit-46',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you define a simple GitLab CI pipeline?',
    probing:
      'Whether you can write a simple .gitlab-ci.yml with workflow rules, pinned images and artifacts.',
    answer: [
      'I define which events trigger a pipeline using `workflow: rules`, then create jobs with explicit images, scripts, artifacts, and failure behavior.',
      "I lint the file with GitLab's CI Lint tool, pin tool images to specific versions, set timeouts, avoid plaintext secrets, and make sure merge-request pipelines can't deploy to production. A real production image job would also authenticate securely, scan the image, and only push it after the required gates pass.",
    ],
    code: [
      {
        title: 'Simple .gitlab-ci.yml with workflow rules',
        language: 'yaml',
        code: `stages: [test, package]

workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

test:
  stage: test
  image: python:3.12-slim
  script:
    - pip install -r requirements.txt
    - pytest --junitxml=report.xml
  artifacts:
    when: always
    reports:
      junit: report.xml

package:
  stage: package
  image: docker:27
  services: ["docker:27-dind"]
  script:
    - docker build -t "$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA" .`,
      },
    ],
    tags: ['gitlab ci', 'pipeline'],
  },
  {
    id: 'itv-mygit-47',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between `only/except` and `rules`?',
    probing:
      'Whether you know why `rules` replaced `only/except` and test rules across pipeline sources.',
    answer: [
      '`only/except` is the older way to include or exclude a job, based mainly on branch, tag, variable, or changed files. `rules` is more expressive: it evaluates ordered conditions using the pipeline source, variables, file changes, and file existence, and lets you set a specific `when` behavior for each one.',
      'I prefer `rules` for new pipelines and avoid mixing the two styles in the same job. I test the behavior across push, merge-request, tag, schedule, and API pipelines, since a mistake in the rules can create duplicate pipelines or accidentally expose a deployment job.',
    ],
    code: [
      {
        title: 'Manual prod deploy only for version tags',
        language: 'yaml',
        code: `deploy-prod:
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v\\d+\\.\\d+\\.\\d+$/'
      when: manual
    - when: never`,
      },
    ],
    tags: ['gitlab ci', 'rules'],
  },
  {
    id: 'itv-mygit-48',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do artifacts and cache differ in GitLab CI?',
    probing:
      'Whether you know artifacts are deliverables and cache is disposable, and how to avoid cache poisoning.',
    answer: [
      'Artifacts are job outputs meant to be passed to later jobs or kept for people to download — binaries, test reports, plans, manifests. Cache exists purely for speed: it holds reusable dependencies like package-manager downloads.',
      'A job has to work correctly even if the cache is completely empty.',
      'I never put secrets in either one. Artifacts use controlled retention and stay immutable once created.',
      'Cache keys include the lock file, and sometimes the branch protection level, to prevent cache poisoning. Production deployment always uses the approved artifact — never whatever happens to be sitting in a cache.',
    ],
    code: [
      {
        title: 'Cache keyed on the lock file, artifacts with expiry',
        language: 'yaml',
        code: `cache:
  key:
    files: [package-lock.json]
  paths: [.npm/]

artifacts:
  paths: [dist/]
  expire_in: 7 days`,
      },
    ],
    tags: ['gitlab ci', 'artifacts', 'cache'],
  },
  {
    id: 'itv-mygit-49',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you deploy to Kubernetes from GitLab CI?',
    probing:
      'Whether you deploy to Kubernetes from GitLab CI with scoped identity, Helm --atomic and rollout checks, or prefer GitOps.',
    answer: [
      'The pipeline builds and scans an image, pushes it tagged with an immutable commit SHA, and updates the Kubernetes release through Helm, plain manifests, or GitOps. I prefer GitOps when I can use it, because then the cluster pulls its own desired state and CI never needs to hold broad cluster credentials.',
      'I use a dedicated ServiceAccount or workload identity with only the access it actually needs, plus protected environments, readiness probes, smoke tests, deployment metrics, and a rollback path. I save the image digest and the Helm revision so the exact release stays traceable.',
    ],
    code: [
      {
        title: 'Staging deploy with Helm and rollout check',
        language: 'yaml',
        code: `deploy-staging:
  stage: deploy
  environment:
    name: staging
  script:
    - helm upgrade --install api ./chart
      --namespace api --create-namespace
      --set image.tag="$CI_COMMIT_SHA"
      --atomic --wait --timeout 5m
    - kubectl rollout status deployment/api -n api --timeout=5m`,
      },
    ],
    followUps: [
      'Why does GitOps reduce the credentials CI needs?',
      'What do you record so the release is traceable?',
    ],
    tags: ['gitlab ci', 'kubernetes', 'helm'],
  },
  {
    id: 'itv-mygit-50',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are manual jobs and environments in GitLab CI?',
    probing:
      'Whether you know manual jobs and protected environments, and that the button alone is not the control.',
    answer: [
      'A manual job, set with `when: manual`, waits for an authorized person to start it. An environment represents a deployment target like staging or production, and GitLab records its deployment history, URLs, and protection rules.',
      "I protect the production environment so only the release group can run it, and I require that the artifact already passed the checks in lower environments first. Clicking the manual button isn't the whole control by itself — I also need separation of duties, traceable change approval, health checks, rollback, and audit logs.",
    ],
    code: [
      {
        title: 'Manual production deploy job',
        language: 'yaml',
        code: `deploy-production:
  when: manual
  allow_failure: false
  environment:
    name: production
    url: https://app.example.com
  rules:
    - if: $CI_COMMIT_TAG`,
      },
    ],
    tags: ['gitlab ci', 'environments', 'manual jobs'],
  },
  {
    id: 'itv-mygit-51',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you optimize GitLab CI pipeline speed?',
    probing:
      'Whether you speed up GitLab CI with DAG `needs`, caching, `rules:changes` and runner design without skipping tests.',
    answer: [
      'I measure queue time and job duration first, then fix the actual bottleneck instead of guessing:',
      '- Use `needs` so independent jobs run as a DAG instead of one stage at a time.\n- Cache dependencies keyed off the lock file.\n- In a monorepo, build only the affected services using `rules:changes`.\n- Parallelize tests while keeping results predictable.\n- Use prebuilt tool images and registries close to the runners.\n- Autoscale runners and separate heavy workloads from fast ones.\n- Build the artifact once and reuse that same immutable artifact across environments, instead of rebuilding it each time.',
      'I never skip required tests just to make the pipeline finish faster. After making changes, I compare median and high-percentile duration, queue time, cache hit rate, flakiness, and infrastructure cost.',
    ],
    followUps: [
      'How does needs change pipeline duration compared with plain stages?',
      'How do you measure whether an optimisation helped?',
    ],
    tags: ['gitlab ci', 'performance'],
  },
  {
    id: 'itv-mygit-52',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot GitLab CI failures?',
    probing:
      'Whether you locate the failing layer first and reproduce with the same image before rerunning.',
    answer: [
      "First I narrow down where the problem actually is: pipeline creation, scheduling, runner execution, the job's own commands, artifacts, or deployment.",
      '1. Read the first meaningful error, not just the final exit code.\n2. Check what changed recently in `.gitlab-ci.yml`, variables, runners, images, or dependencies.\n3. Confirm the runner is online, correctly tagged, and allowed to pick up the job.\n4. Check protected variables and environment permissions.\n5. Check artifact paths, cache behavior, disk space, network/DNS, and the status of external services.\n6. Reproduce the job locally with the same container image and commands, using safe test credentials.',
      "I fix the root cause, and only rerun the job once I know it's safe to run again — a job is idempotent if running it twice causes no harm. I validate the downstream outputs, and add something to prevent a repeat: pinning a version, improving an error message, setting a timeout, or monitoring runner capacity.",
    ],
    tags: ['gitlab ci', 'troubleshooting'],
  },
]
