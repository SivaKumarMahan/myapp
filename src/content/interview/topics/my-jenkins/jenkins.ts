import type { InterviewQuestion } from '../../../types'

/** Jenkins architecture, pipelines as code, shared libraries, approvals and deployment. */
export const myJenkinsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myjen-1',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Jenkins, and what are the main parts of a Declarative Pipeline?',
    probing:
      'Whether you know the controller/agent split, what a Jenkinsfile is and when to use declarative vs scripted.',
    answer: [
      'Jenkins is an automation server used to build CI/CD pipelines. It has two parts:',
      '- **The controller** schedules jobs, stores configuration, and coordinates agents.\n- **Agents** are the machines or containers that actually run the build steps.',
      "A `Jenkinsfile` holds the pipeline as code, written in Groovy. It's version-controlled and normally kept at the root of the application repository, so pipeline changes go through the same review and history as any other code change.",
      'There are two pipeline styles:',
      "- **Declarative Pipeline**: The default choice. Structured, easier to read, has built-in validation.\n- **Scripted Pipeline**: More flexible, but easier to turn into a mess. Use only when Declarative can't do what you need.",
      'The main sections in a Declarative Pipeline are `pipeline`, `agent`, `environment`, `options`, `parameters`, `triggers`, `stages`, `stage`, `steps`, `when`, `tools`, and `post`.',
      "Common steps you'll see in almost every pipeline: `checkout`/`git` to pull code, `sh`/`bat` to run shell commands, `withCredentials` to use secrets safely, `junit` to publish test results, `archiveArtifacts` to save build output, `stash`/`unstash` to pass files between stages, and various notification steps.",
    ],
    tags: ['jenkins', 'basics', 'jenkinsfile'],
  },
  {
    id: 'itv-myjen-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain Jenkins controller-agent architecture and how it enables distributed builds.',
    probing:
      'Whether you understand controller-agent architecture, labels and ephemeral agents, and secure it properly.',
    answer: [
      'The Jenkins controller holds the configuration, schedules jobs, evaluates pipelines, manages credentials and plugins, records build history, and hands out work. Agents are the machines that actually run the build steps.',
      'An agent can be a static VM or a container/Pod that gets created just for one job and thrown away afterward.',
      'I label agents by what they can do, and use the pipeline `agent` directive so each workload lands on the right kind of machine. Agents that come from Kubernetes are especially clean: each one starts from an approved image, runs exactly one job, and disappears. That cuts down on configuration drift and stops secrets from lingering on disk.',
      "For security, I don't run builds on the controller itself, I give credentials only the access they need, I isolate agents from each other, restrict network access, keep images and plugins patched, and keep trusted and untrusted workloads apart. I also watch queue length, how busy the executors are, agent connection failures, disk space, and overall controller health.",
    ],
    code: [
      {
        title: 'Distributed build flow',
        language: 'text',
        code: `Git webhook → Jenkins controller → queue → labeled agent
                                   → build/test/scan → artifact registry`,
      },
    ],
    tags: ['jenkins', 'architecture', 'agents'],
  },
  {
    id: 'itv-myjen-3',
    level: 'basic',
    kind: 'open',
    prompt: 'Freestyle job versus Pipeline: what is the difference?',
    probing:
      'Whether you know why Pipeline-as-code beats UI-configured Freestyle jobs for real CI/CD.',
    answer: [
      "A Freestyle job is configured mostly through the Jenkins UI. It's fine for a simple, one-off task, but its configuration is harder to review, version, and reuse.",
      'A Pipeline defines every delivery stage as code in a `Jenkinsfile`. That means code review, durable execution, parallel stages, shared libraries, credential binding, approvals, and a repeatable promotion process.',
      'I prefer Declarative Pipeline for normal CI/CD work because its structure and built-in validation are clearer. Scripted Pipeline is more flexible, but it needs a lot more discipline to keep readable.',
    ],
    tags: ['jenkins', 'freestyle', 'pipeline'],
  },
  {
    id: 'itv-myjen-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Jenkins plugins, and how do you manage them safely?',
    probing:
      'Whether you treat plugins as privileged code with pinning, testing and a small footprint.',
    answer: [
      'Plugins extend Jenkins to work with source control, credentials, agents, pipelines, test reports, artifact repositories, cloud provisioning, and notifications.',
      'Every plugin is code that runs inside Jenkins, so it carries real compatibility and supply-chain risk. I only install supported plugins, pin and test versions on a non-production controller first, watch for security advisories, remove plugins nobody uses, back up configuration, and have a plan to restart or roll back.',
      'I try not to install a plugin just because a pipeline could call it — a CLI, an API, or a shared-library integration is often safer and easier to govern.',
    ],
    tags: ['jenkins', 'plugins', 'security'],
  },
  {
    id: 'itv-myjen-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage Jenkins pipelines as code?',
    probing:
      'Whether you keep Jenkinsfiles in Git, put common logic in a pinned shared library and review both.',
    answer: [
      "I keep the `Jenkinsfile` with the application code, so changes go through pull-request review and version history like anything else. Behavior that's common across projects lives in a versioned shared library:",
      'That keeps the Jenkinsfile itself readable — it just declares the business stages — while the library functions implement the approved build, scan, and deployment patterns. For production, I pin the library to a specific version, test the library code itself, and write migration notes whenever a change would break existing pipelines.',
      'Credentials are referenced by ID and scoped to the smallest block that needs them — never embedded directly in Groovy code. Controller-level settings are managed separately through Jenkins Configuration as Code.',
      'I test pipeline changes in a sandbox or multibranch job first, and require reviewers on any change to the Jenkinsfile or shared library, because that code can reach production credentials.',
      'Use Jenkinsfile (declarative pipeline) → Store in Git → Version control changes → Reuse shared libraries.',
      '**Detailed interview approach:** I keep a declarative `Jenkinsfile` in the application repository, so pipeline changes go through the same review and history as any other code change.',
      "Behavior that's shared and well-tested — checkout, quality checks, security scans, publishing artifacts, deployment, notifications — lives in a versioned Jenkins Shared Library. Each service repository passes in explicit inputs rather than copying Groovy code around.",
      'Multibranch jobs discover branches and pull requests through authenticated GitHub webhooks and report status back to the commit. I pin tool and agent image versions, protect the library and main branches, sandbox untrusted pull requests, and keep GitHub and Jenkins credentials tightly scoped.',
      'I test a shared library upgrade in a sample pipeline before rolling it out by version. I limit manual UI edits and replays, or reconcile them back into Git, so everything stays auditable.',
    ],
    code: [
      {
        title: 'Shared library layout',
        language: 'text',
        code: `shared-library/
├── vars/
├── src/
└── resources/`,
      },
    ],
    tags: ['jenkins', 'pipeline as code', 'shared libraries'],
  },
  {
    id: 'itv-myjen-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Jenkins shared libraries, and how do you write and use them safely?',
    probing:
      'Whether you know the shared library structure, how to load a pinned version and how to keep it safe.',
    answer: [
      'A shared library is versioned Groovy code and supporting files reused across Jenkinsfiles. Global steps go in `vars/`, classes go in `src/`, supporting files go in `resources/`, and tests live alongside the library.',
      "A pipeline loads a pinned release with `@Library('company-pipeline@v3') _`, or an approved dynamic library configuration, then calls a simple step like `companyBuild()`.",
      'I keep the Jenkinsfile itself readable and avoid burying every business decision inside the library. Library releases follow semantic versioning, go through pull-request review, have unit and pipeline tests, and come with changelogs and migration notes.',
      'Production jobs pin a specific version rather than silently tracking `main`. Parameters get validated, shell arguments are handled safely, and credentials are only bound inside the smallest block that needs them.',
      'Because a trusted library can bypass parts of the Groovy sandbox and reach credentials, I keep ownership and write access to it tightly restricted. I roll out a new version to a few jobs first, watch it, and keep the previous version around in case I need to roll back.',
      "In our Jenkins setup, we use **Shared Libraries** to centralize and reuse pipeline logic across multiple projects. The library is a separate Git repository with a standard structure — `vars/` for global scripts, `src/` for Groovy classes, and `resources/` for templates. In the `Jenkinsfile`, we import it using `@Library('my-shared-lib')` and call shared steps like `buildApp()` or `deployApp()`. This ensures consistency, reduces duplication, and makes maintenance easier — if we update a function in the shared library, it's automatically reflected across all pipelines.",
      'Jenkins Shared Libraries are a powerful way to reuse code across multiple Jenkins pipelines. They allow you to define common functions, classes, and variables in a centralized repository, which can then be imported and used in your Jenkinsfiles.',
      'This promotes code reuse, maintainability, and consistency across your CI/CD pipelines.',
      '**Typical Structure of Jenkins Shared Libraries**',
      'A typical Jenkins Shared Library has the following structure:',
      '1. **`vars/`**: This directory contains global variables and functions that can be called directly from Jenkinsfiles. Each Groovy file in this directory defines a function or variable.\n2. **`src/`**: This directory contains Groovy classes organized in packages. You can define more complex logic here, which can be instantiated and used in your Jenkinsfiles.\n3. **`resources/`**: This directory contains static resources like templates or configuration files that can be loaded in your shared library code.\n4. **`README.md`**: A documentation file that explains how to use the shared library.',
      '**Integrating Shared Libraries into Jenkinsfiles**',
      "To use a Jenkins Shared Library in your Jenkinsfile, you need to declare it at the top of your Jenkinsfile using the `@Library` annotation. Here's how you can do it: In this example:",
      "1. The `@Library('my-shared-library') _` line imports the shared library named `'my-shared-library'`.\n2. You can then call functions defined in the `vars/` directory directly, such as `myFunction()`.\n3. You can also instantiate classes defined in the `src/` directory, like `com.example.MyClass`, and call their methods.",
      'By using Jenkins Shared Libraries, you can streamline your Jenkins pipelines, reduce duplication, and ensure that best practices are consistently applied across your CI/CD processes.',
    ],
    code: [
      {
        title: 'Shared library structure',
        language: 'text',
        code: `(root)
├── vars/
│   ├── myFunction.groovy
│   └── anotherFunction.groovy
├── src/
│   └── com/example/
│       └── MyClass.groovy
├── resources/
│   └── myTemplate.txt
└── README.md`,
      },
      {
        title: 'Using a shared library in a Jenkinsfile',
        language: 'text',
        code: `@Library('my-shared-library') _  // Import the shared library
pipeline {
    agent any

    stages {
        stage('Example Stage') {
            steps {
                // Call a function from the shared library
                myFunction()

                // Instantiate and use a class from the shared library
                script {
                    def myClassInstance = new com.example.MyClass()
                    myClassInstance.doSomething()
                }
            }
        }
    }
}`,
      },
    ],
    tags: ['jenkins', 'shared libraries', 'groovy'],
  },
  {
    id: 'itv-myjen-7',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Walk through a Jenkins CI/CD workflow you have operated and the stages in its Jenkinsfile.',
    probing:
      'Whether you can walk through the stages of a real Jenkinsfile and the evidence each stage leaves.',
    answer: [
      'A typical multibranch pipeline starts from a reviewed Git change or a webhook.',
      "`Checkout` records the commit. `Validate` runs formatting and linting. `Test` runs unit tests and publishes the reports. `Quality/Security` runs static analysis, dependency, secret, and policy checks. `Build` creates the package and a multi-stage container image. `Publish` pushes the image digest, which never changes after it's built, along with a software bill of materials, to the registry. `Deploy` then promotes that same digest through the lower environments before an approved, gradual rollout to production.",
      "Production uses protected credentials, an approval step where required, health and SLO checks, and rollback to the last known-good digest. Shared libraries implement the controls that are common everywhere; the Jenkinsfile itself just shows what's specific to that service.",
      'I keep the commit, test results, scan results, artifact digest, approval record, deployment record, and verification result as evidence for the release.',
      'A well-built pipeline usually does this, in order:',
      "1. Checks out the exact commit.\n2. Installs dependencies from a lock file, so builds are repeatable.\n3. Builds the application and runs unit and integration tests.\n4. Publishes the test reports.\n5. Runs code quality, dependency, and image scans, and enforces a quality gate.\n6. Builds and signs one artifact. That artifact never changes after it's built — it's built once and reused everywhere.\n7. Pushes it to a registry.\n8. Promotes that exact same artifact through each environment.",
      'Lower environments like dev and staging usually deploy automatically. Production usually needs a protected approval step, health or SLO checks after deploy, and a rollback plan if something goes wrong.',
      'Shared libraries hold reusable, reviewed pipeline logic, so the `Jenkinsfile` itself stays short and easy to read — it shows what the application does, not how every shared step works internally.',
      'A CI job typically builds, tests, scans, and publishes. A separate CD or GitOps flow then updates the desired image version in Git, and Argo CD deploys it to Kubernetes from there. Prometheus and Grafana watch the result, and alerts go out through whatever notification system the team has approved (Slack, email, etc.).',
    ],
    code: [
      {
        title: 'Jenkinsfile: test, image, trigger deploy job',
        language: 'text',
        code: `pipeline {
  agent none
  stages {
    stage('Test') { agent { label 'maven' }; steps { sh 'mvn -B test' } }
    stage('Image') { agent { label 'docker' }; steps { sh 'docker build -t app:\${GIT_COMMIT} .' } }
    stage('Deploy') { steps { build job: 'deploy-app', parameters: [string(name: 'VERSION', value: env.GIT_COMMIT)] } }
  }
  post { always { junit allowEmptyResults: true, testResults: '**/surefire-reports/*.xml' } }
}`,
      },
    ],
    tags: ['jenkins', 'jenkinsfile', 'workflow'],
  },
  {
    id: 'itv-myjen-8',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you build a CI/CD pipeline from scratch with zero downtime and rollback support?',
    probing:
      'Whether you know zero downtime and rollback depend on replicas, probes and compatible schema, not just pipeline syntax.',
    answer: [
      'Before writing any pipeline code, I nail down the basics: where the source comes from, what the artifact is, which environments exist, who approves what, the availability target, whether the database changes are compatible, what counts as healthy, and how far back I can roll back. A representative Jenkinsfile flow looks like this:',
      "Zero downtime isn't just pipeline syntax — it needs multiple replicas, readiness and startup probes, enough spare capacity during the rollout, graceful shutdown, database changes that work with both old and new code, and control over traffic. I also run smoke tests and watch error rate and latency as the rollout happens.",
      'For rollback, I go back to the previous artifact or Helm revision — the one already built and tested, never rebuilt. Database changes follow an expand-migrate-contract approach, or fall back to a tested restore plan.',
    ],
    code: [
      {
        title: 'Jenkinsfile with parallel CI, approval and Helm deploy',
        language: 'text',
        code: `pipeline {
  agent none
  stages {
    stage('CI') {
      parallel {
        stage('Test') { agent { label 'build' }; steps { sh 'npm ci && npm test' } }
        stage('Scan') { agent { label 'security' }; steps { sh 'trivy fs --exit-code 1 .' } }
      }
    }
    stage('Build and publish') {
      agent { label 'docker' }
      steps { sh 'docker build -t registry/app:$GIT_COMMIT . && docker push registry/app:$GIT_COMMIT' }
    }
    stage('Production approval') { steps { input 'Deploy approved artifact?' } }
    stage('Deploy') {
      agent { label 'deploy' }
      steps { sh 'helm upgrade --install app chart --set image.tag=$GIT_COMMIT --atomic --wait' }
    }
  }
}`,
      },
    ],
    followUps: [
      'What exactly does --atomic do on a failed Helm upgrade?',
      'How do you roll back when the release also ran a database migration?',
    ],
    tags: ['jenkins', 'zero downtime', 'rollback'],
  },
  {
    id: 'itv-myjen-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What does shift-left mean in DevOps?',
    probing:
      'Whether you understand shift-left as fast, early, actionable checks - not dumping everything on developers.',
    answer: [
      'Shift-left means running quality, security, compliance, and operability checks earlier in development, while fixes are still cheap. That means local pre-commit checks, unit tests on every pull request, scanning dependencies/secrets/infrastructure code, threat modeling, and checking policy before deployment.',
      "It doesn't mean dumping all the responsibility on developers, though. Platform and security teams still need to provide fast tools, approved templates, clear error messages, and a way to request an exception.",
      'Runtime monitoring, dynamic security testing, patching, and incident response are still necessary — some risks only show up once the system is actually running.',
      'I track how fast feedback comes back, how many defects still escape to production, how many false positives show up, how long fixes take, and how often developers just bypass the check. If a scan takes hours or produces findings nobody can act on, people will ignore it. Good shift-left controls are automated, focused on real risk, and fast.',
    ],
    tags: ['shift-left', 'devsecops'],
  },
  {
    id: 'itv-myjen-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate SonarQube, Trivy, and Slack in a Jenkins quality pipeline?',
    probing:
      'Whether gates block publication in the right order and Slack only reports the result.',
    answer: [
      "My order is: run tests and get coverage, run the SonarQube scan, check the quality gate, build the image, scan it with Trivy, publish it, then deploy. Slack just reports the result and links to the evidence — it isn't the control itself, the gates before it are.",
      'Tokens live in Jenkins credentials, reports get kept, scanner versions are pinned, and any vulnerability exception needs an owner and an expiry date. I test this by deliberately failing the quality gate and confirming it actually blocks the image from being published.',
      'The quality flow should fail before publishing or deploying an unacceptable artifact: Required setup:',
      '- Configure the SonarQube server and token in Jenkins. Keep the token in Credentials, not the repository.\n- Install and configure the SonarQube Scanner and notification integration, or call notification webhooks through protected credentials.\n- Install a pinned Trivy version in the agent image, rather than downloading an unverified binary on every build.\n- Agree on a quality-gate and vulnerability policy up front. Cover severity, fix availability, how long exceptions last, and how long reports are kept.',
      'Unlike the original draft, Trivy now returns a failing exit code for policy violations. Secrets are no longer embedded in the Jenkinsfile. Publication only happens after both the quality gate and the scan pass.',
      "In production I also generate an SBOM (a software bill of materials — a list of what's inside the image), sign the image digest, archive access-controlled reports, and verify the signature at deployment.",
    ],
    code: [
      {
        title: 'Quality gate and Trivy stages with Slack notification',
        language: 'text',
        code: `stage('SonarQube') {
  steps {
    withSonarQubeEnv('sonarqube') { sh 'mvn verify sonar:sonar' }
    timeout(time: 10, unit: 'MINUTES') {
      waitForQualityGate abortPipeline: true
    }
  }
}
stage('Image scan') {
  steps { sh 'trivy image --severity HIGH,CRITICAL --exit-code 1 registry/app:$GIT_COMMIT' }
}
post {
  success { slackSend color: 'good', message: "SUCCESS \${env.JOB_NAME} #\${env.BUILD_NUMBER} \${env.BUILD_URL}" }
  failure { slackSend color: 'danger', message: "FAILED \${env.JOB_NAME} #\${env.BUILD_NUMBER} \${env.BUILD_URL}" }
}`,
      },
      {
        title: 'Quality flow',
        language: 'text',
        code: `checkout → unit tests → SonarQube analysis → quality gate
         → image build → Trivy scan → sign/publish → deploy → notify`,
      },
      {
        title: 'Full Jenkinsfile: test, SonarQube, gate, Trivy, publish, notify',
        language: 'text',
        code: `pipeline {
  agent { label 'ephemeral-linux' }

  environment {
    IMAGE = "registry.example.com/team/app:\${BUILD_NUMBER}"
  }

  stages {
    stage('Checkout and Test') {
      steps {
        checkout scm
        sh 'npm ci && npm test'
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('sonarqube-production') {
          sh 'sonar-scanner -Dsonar.projectKey=team-app'
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Build and Scan Image') {
      steps {
        sh 'docker build --pull --tag "$IMAGE" .'
        sh 'trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed "$IMAGE"'
      }
    }

    stage('Publish') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'registry-credentials',
          usernameVariable: 'REGISTRY_USER',
          passwordVariable: 'REGISTRY_PASSWORD'
        )]) {
          sh 'printf %s "$REGISTRY_PASSWORD" | docker login registry.example.com --username "$REGISTRY_USER" --password-stdin'
          sh 'docker push "$IMAGE"'
        }
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: '**/test-results/*.xml'
      deleteDir()
    }
    success {
      slackSend color: 'good', message: "SUCCESS: \${JOB_NAME} #\${BUILD_NUMBER}"
    }
    failure {
      slackSend color: 'danger', message: "FAILED: \${JOB_NAME} #\${BUILD_NUMBER} — \${BUILD_URL}"
    }
  }
}`,
      },
    ],
    tags: ['sonarqube', 'trivy', 'slack', 'jenkins'],
  },
  {
    id: 'itv-myjen-11',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you implement CI/CD approval workflows in Jenkins?',
    probing:
      'Whether you automate objective gates first and use a restricted, timed-out input step for human decisions.',
    answer: [
      'I automate every objective gate first — tests, scans, policy checks, staging deployment, health checks — and only use `input` for a decision that genuinely needs a human to be accountable for it.',
      "The approval screen shows the artifact version, the plan or diff, test results, risk, the change ticket, and the rollback plan. Jenkins authorization restricts who can approve, and production credentials aren't available before the deployment stage runs. Every approval gets logged.",
      "For emergencies, I use a separate break-glass path that's still audited and gets a review afterward. I avoid approvals that just ask someone to click a button without giving them enough information to make a real decision.",
      'Use Jenkins “input step” for manual approval → Or integrate with Jira/ServiceNow for change approvals before deploying to prod.',
      '**Detailed interview approach:** I put the approval step after automated build, test, security, policy, and deployment-plan checks have already passed. That way the approver is looking at the exact artifact that was built and never changed since, along with the commit, the target environment, the risk, the evidence, and the rollback plan.',
      'In Jenkins this is usually a protected `input` step with a timeout and a named approver group. Enterprise change records can be checked through an API if needed.',
      "The same build artifact gets promoted through environments — it's never rebuilt along the way. Production credentials only become available after approval, and the person who authored the change is not allowed to approve their own high-risk change.",
      "I keep a record of who approved or rejected it, when, and what the deployment result was. An emergency bypass path exists, but it's limited, audited, and always followed by a review afterward.",
    ],
    code: [
      {
        title: 'Restricted production approval with a timeout',
        language: 'text',
        code: `stage('Production approval') {
  options { timeout(time: 2, unit: 'HOURS') }
  steps {
    input message: 'Promote tested artifact to production?',
          ok: 'Deploy',
          submitter: 'production-approvers'
  }
}`,
      },
    ],
    tags: ['jenkins', 'approvals', 'input'],
  },
  {
    id: 'itv-myjen-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is a webhook, and how do you use it in Jenkins pipelines?',
    probing:
      'Whether you set up webhooks securely and keep PR builds away from production credentials.',
    answer: [
      'A webhook is an authenticated HTTP notification from GitHub, GitLab, or another system telling Jenkins that something happened — a push, a pull request, and so on. It saves Jenkins from having to constantly poll for changes, and it carries event details, but Jenkins still fetches the repository itself and checks the actual commit before it builds anything.',
      "I set up a multibranch or organization job, register the Jenkins endpoint over HTTPS, check the provider's signature and secret and the event type, and restrict which sources can reach it where that's supported. Pull requests run tests and scans without any production credentials. A protected merge or tag is what's allowed to publish and trigger a deployment.",
      'Branch discovery rules stop an untrusted fork from running trusted code that has access to secrets.',
      "When something breaks, I check the provider's delivery history, DNS/TLS, the reverse proxy, the signature and secret, Jenkins logs, plugin configuration, event filters, and queue capacity. Webhook redelivery needs to be safe to run more than once, so a duplicate event doesn't trigger a duplicate release.",
    ],
    tags: ['jenkins', 'webhooks'],
  },
  {
    id: 'itv-myjen-13',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you separate CI and CD pipelines in Jenkins, and what triggers each one?',
    probing:
      'Whether you split CI and CD into separately triggered, separately credentialed pipelines that pass digests.',
    answer: [
      "CI belongs to the application repository and gets triggered by pull requests and commits. It compiles, tests, scans, builds, and publishes one artifact that never changes after that — it doesn't rebuild separately for each environment.",
      'Once it succeeds, it records the artifact digest and can notify, or update, a deployment repository.',
      'CD is a separate, protected job or a GitOps workflow. It gets triggered by an approved artifact promotion, a change to the deployment repository, a release tag, or a manual production approval — never by an arbitrary developer branch.',
      "It deploys the exact digest it was given, applies the environment's configuration, runs health and business checks, and records or runs the rollback if needed.",
      'Credentials and permissions are kept separate, so CI can never directly touch production.',
      'Splitting things this way lets each pipeline retry and get approved independently without losing track of what happened. I pass digests and metadata between the two, not workspace files, and I can compare both pipelines by commit, artifact digest, change request, and deployment ID.',
    ],
    followUps: [
      'What should be allowed to trigger the CD pipeline?',
      'How do you trace one release across both pipelines?',
    ],
    tags: ['jenkins', 'ci', 'cd', 'separation'],
  },
  {
    id: 'itv-myjen-14',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'A Jenkins pipeline fails although the application works locally. How do you troubleshoot it?',
    probing:
      'Whether you compare laptop vs CI differences systematically and reproduce in the same agent container.',
    answer: [
      'I find the first stage that actually failed and save its exact console error, test report, agent label, container image, environment, and commit.',
      "Then I compare things that often differ between a laptop and CI: the Java/Node/Python and build-tool versions, lockfiles, case-sensitive file paths, locale and timezone, a clean workspace versus a dirty one, environment variables, credentials, network/proxy/CA trust, resource limits, and any service that's available locally but missing in CI.",
      'I reproduce the failure in the same agent container, running the same non-interactive command, instead of poking at Jenkins settings before I actually understand the failure.',
      "Common causes: uncommitted local files, cached dependencies that hide a real problem, tests that depend on order or timing, a private registry CI can't reach, wrong file permissions, or secrets that are scoped to a different branch.",
      'Any temporary debug output I add has to avoid printing credentials.',
      'Once I find it, I fix the build definition, dependency pinning, test isolation, agent image, or pipeline configuration, rerun from a clean environment, and confirm the same artifact passes every later stage. Hermetic builds, committed lockfiles and wrapper scripts, standardized build images, and being able to run the same CI commands locally all help stop this from happening again.',
    ],
    tags: ['jenkins', 'troubleshooting', 'works locally'],
  },
  {
    id: 'itv-myjen-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which applications and deployment tools do you pair with Jenkins pipelines?',
    probing:
      'Whether you pair Jenkins with the right deployment tool per workload instead of making it do everything.',
    answer: [
      "I pick tools based on the workload, instead of forcing Jenkins to be the deployment engine for everything. Jenkins can build and test Java/Maven, Node, Python, and .NET services, package them as images that don't change after they're built, and store them in ECR, ACR, JFrog, Nexus, or another approved registry.",
      'For Kubernetes, delivery goes through Helm plus Argo CD or Flux, or a controlled `kubectl` step. Cloud infrastructure uses Terraform. VM configuration uses Ansible. Serverless deployment uses a provider framework or infrastructure-as-code.',
      'Jenkins orchestrates the tests, policy checks, artifact publication, approvals, and promotion. Each tool gets its own identity, scoped to only what it needs, and short-lived.',
      'I pass artifact digests and versioned manifests between stages, then check application health, logs, metrics, and a real transaction. This keeps Jenkins swappable later on, and avoids giant imperative scripts that hide what state the deployment is actually in.',
    ],
    tags: ['jenkins', 'tools', 'deployment'],
  },
  {
    id: 'itv-myjen-16',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you integrate GitHub Enterprise with Jenkins securely?',
    probing:
      'Whether you integrate GitHub Enterprise with a GitHub App, signed webhooks and fork-safe discovery.',
    answer: [
      "I set the GitHub Enterprise Server URL and trusted CA in Jenkins' GitHub/branch-source integration, then create an organization folder or multibranch pipeline that discovers repositories and pull requests on its own.",
      'GitHub sends signed HTTPS webhooks to Jenkins. Jenkins fetches the exact commit itself and reports the check result back to the pull request.',
      'Repository discovery and event filters stop an arbitrary repository or an untrusted fork from running a privileged job.',
      "For authentication, I use a GitHub App where it's supported, because it gives repository-scoped permissions and short-lived installation tokens. A narrowly scoped service account or deploy key is the fallback.",
      'Secrets live in Jenkins credentials and are only bound for the step that needs them. Production deployment credentials are never available to pull-request jobs. TLS, the proxy/firewall, and host-key trust are all set up explicitly.',
      'I require branch protection and Jenkins status checks, protect changes to the Jenkinsfile and shared library with code owners, and log the webhook, checkout, build, and deployment identity for every run.',
      "When troubleshooting, I check the webhook delivery history and signature, DNS/TLS/proxy, GitHub API rate limits, the app's installation permissions, branch discovery, the Jenkins queue, and commit-status permissions.",
    ],
    followUps: [
      'Why prefer a GitHub App over a personal access token?',
      'How do you stop an untrusted fork from running a privileged job?',
    ],
    tags: ['jenkins', 'github enterprise', 'security'],
  },
  {
    id: 'itv-myjen-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Ten Jenkins jobs have nearly the same configuration. How do you manage them?',
    probing:
      'Whether you replace copy-pasted jobs with parameterised pipelines, Job DSL or JCasC without mixing up permissions.',
    answer: [
      'I avoid maintaining ten separately-edited UI jobs. If one workflow just varies by environment, component, or target, I replace all of them with a single parameterized Pipeline backed by one versioned `Jenkinsfile`.',
      'For jobs that are genuinely different, I generate them with Job DSL or Jenkins Configuration as Code, and put the shared logic in a reviewed shared library. Multibranch Pipelines make sense when each repository or branch really does own its own pipeline.',
      'Parameters and templates cut down on duplication, but production credentials and permissions still need to stay separate — a generic job should never let an untrusted parameter pick a privileged deployment target.',
    ],
    tags: ['jenkins', 'job dsl', 'parameterized'],
  },
  {
    id: 'itv-myjen-18',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What are the key points about reusable jobs, triggers, restarts and post actions in Jenkins?',
    probing:
      'Whether you know reusable jobs, webhook vs polling triggers, restart-from-stage and post conditions.',
    answer: [
      'Avoid copying job configuration between jobs in the UI. Use versioned Jenkinsfiles, shared libraries, Job DSL, or Configuration as Code instead. Parameterized or multibranch Pipelines cut down on duplication, while permissions and production credentials still stay specific to each environment.',
      "`$JENKINS_HOME` stores the controller's configuration, build metadata, and plugin data. Back it up regularly and actually test that you can restore it — don't treat it as a place to store build artifacts.",
      "Git webhooks are the preferred way to trigger a build, because they fire on the actual event instead of polling. Validate the webhook signature, use TLS, and restrict who can hit the endpoint. Poll SCM and periodic cron triggers are fallback options — they use up capacity by checking on a schedule instead of reacting to a real push. Jenkins cron has its own syntax, and you should spread jobs out with `H` so they don't all fire at the same minute.",
      'A failed Pipeline can be restarted from a specific stage, but only when that stage is safe to rerun and the artifacts or inputs it needs still exist. This is a convenience, not a substitute for actually designing your deployment to be safe to run more than once.',
      "Declarative Pipeline `post` conditions — `success`, `failure`, `unstable`, `changed`, and `always` — run after the Pipeline or stage finishes. Use them for notifications, publishing reports, and light cleanup. Make sure cleanup doesn't break if an earlier stage never got far enough to create every resource it normally would.",
    ],
    tags: ['jenkins', 'triggers', 'post'],
  },
  {
    id: 'itv-myjen-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage Jenkins agents and Git integration safely?',
    probing:
      'Whether you treat agents as isolated environments and integrate Git with scoped credentials and explicit refs.',
    answer: [
      'Treat every Jenkins agent as an isolated execution environment. Static agents can connect over SSH. Inbound agents connect using a supported agent protocol with their own authentication.',
      'For untrusted or variable workloads, prefer ephemeral agents that only get the access they actually need, and never run builds on the controller itself. Keep an eye on agent capacity, disk space, workspace cleanup, tool versions, and connection failures.',
      "Git integration needs a narrowly scoped credential or a GitHub App, branch protection, webhook signature validation, and a clearly defined ref to check out. `git pull` fetches changes and merges them in one step. In automation, it's better to run an explicit `fetch` and then a reviewed merge or rebase, so the behavior stays predictable.",
      "A revert adds a new commit that undoes a prior commit. It's generally safer than rewriting history on a shared, protected branch.",
    ],
    tags: ['jenkins', 'agents', 'git'],
  },
  {
    id: 'itv-myjen-20',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you communicate with a Jenkins server and an Azure Kubernetes Service cluster?',
    probing:
      'Whether you can connect Jenkins to AKS with a service principal and kubectl, or run agents in AKS with the Kubernetes plugin.',
    answer: [
      'To communicate with a Jenkins server and an Azure Kubernetes Service (AKS) cluster, you typically follow these steps:',
      '**Using Azure Service Principal**',
      '1. **Create a Service Principal**: First, you need to create a service principal in Azure that Jenkins can use to authenticate and interact with the AKS cluster. You can create a service principal using the Azure CLI with the following command:\n2. **Configure Jenkins Credentials**: In Jenkins, go to `Manage Jenkins` > `Manage Credentials` and add a new credential using the service principal details (client ID, client secret, tenant ID, and subscription ID).\n3. **Install Azure CLI on Jenkins**: Ensure that the Azure CLI is installed on your Jenkins server so that it can interact with Azure resources.\n4. **Authenticate Jenkins with Azure**: In your Jenkins pipeline, use the Azure CLI to log in using the service principal credentials. You can use the following command in a shell step:\n5. **Get AKS Credentials**: Use the Azure CLI to get the credentials for your AKS cluster. This will configure `kubectl` to communicate with the AKS cluster:\n6. **Use kubectl in Jenkins Pipeline**: Now you can use `kubectl` commands in your Jenkins pipeline to interact with the AKS cluster, such as deploying applications, scaling services, or managing resources.',
      '**Using Jenkins Kubernetes Plugin**',
      '1. **Install Kubernetes Plugin**: In Jenkins, install the Kubernetes plugin from the Jenkins plugin manager. This plugin allows Jenkins to dynamically create build agents in a Kubernetes cluster.\n2. **Configure Kubernetes Cloud**: In Jenkins, go to `Manage Jenkins` > `Configure System` and add a new Kubernetes cloud. Provide the necessary details such as the Kubernetes API URL, credentials (you can use the service principal created earlier), and namespace.\n3. **Define Pod Templates**: Create pod templates that define the containers and resources needed for your Jenkins build agents. You can specify the Docker images, resource limits, and other configurations.\n4. **Use Jenkins Pipeline with Kubernetes**: In your Jenkins pipeline, you can specify the use of the Kubernetes cloud and pod templates to run your builds. This allows Jenkins to spin up build agents in the AKS cluster as needed.',
      '**Jenkins Pipeline Example**',
      'This example demonstrates how to authenticate to Azure, connect to an AKS cluster, and deploy a Kubernetes manifest using Jenkins. Adjust the pipeline stages and steps according to your specific requirements.',
    ],
    code: [
      {
        title: 'Create a service principal',
        language: 'bash',
        code: `az ad sp create-for-rbac --name jenkins-aks-sp --role contributor \\
  --scopes /subscriptions/<SUB_ID>/resourceGroups/<RG_NAME>`,
      },
      {
        title: 'Service principal output (placeholders)',
        language: 'json',
        code: `{
  "appId": "<CLIENT_ID>",
  "password": "<CLIENT_SECRET>",
  "tenant": "<TENANT_ID>"
}`,
      },
      {
        title: 'Log in with the service principal',
        language: 'bash',
        code: `az login --service-principal -u <CLIENT_ID> -p <CLIENT_SECRET> --tenant <TENANT_ID>`,
      },
      {
        title: 'Get AKS credentials',
        language: 'bash',
        code: `az aks get-credentials --resource-group <ResourceGroupName> --name <AKSClusterName>`,
      },
      {
        title: 'Jenkinsfile: authenticate, connect and deploy to AKS',
        language: 'text',
        code: `pipeline {
  agent any

  environment {
    AZURE_CREDENTIALS = credentials('azure-service-principal')
    RESOURCE_GROUP = 'myResourceGroup'
    AKS_NAME = 'myAksCluster'
  }

  stages {
    stage('Authenticate to Azure') {
      steps {
        sh '''
          az login --service-principal \\
            -u $AZURE_CREDENTIALS_USR \\
            -p $AZURE_CREDENTIALS_PSW \\
            --tenant <TENANT_ID>
        '''
      }
    }

    stage('Connect to AKS') {
      steps {
        sh 'az aks get-credentials -g $RESOURCE_GROUP -n $AKS_NAME --overwrite-existing'
      }
    }

    stage('Deploy to AKS') {
      steps {
        sh 'kubectl apply -f k8s/deployment.yaml'
      }
    }
  }
}`,
      },
    ],
    tags: ['jenkins', 'aks', 'azure'],
  },
  {
    id: 'itv-myjen-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you deploy to Kubernetes from Jenkins?',
    probing:
      'Whether you deploy to Kubernetes from Jenkins by digest, directly with Helm or via GitOps, and recover safely.',
    answer: [
      'The Jenkinsfile lives with the application code, and each build runs on a fresh, versioned agent that is thrown away afterward. Jenkins reaches the registry and the cluster using scoped credentials or a workload identity, never by hardcoding secrets into commands or letting them show up in logs.',
      'Production deploys are locked down: only certain branches can trigger one, they go through the right environment, they need approval, and only a trusted, scanned artifact is allowed through.',
      'For a direct Helm deployment, Jenkins takes the exact image digest that was built and tested, passes it into a reviewed Helm chart, and runs `helm upgrade --install --atomic --wait --timeout ...`. It then confirms the rollout with `kubectl rollout status` and runs an application smoke test.',
      "With GitOps, Jenkins doesn't touch the cluster directly. It publishes the image and then opens or commits a change that updates the desired state in Git. Argo CD or Flux picks that up and reconciles the cluster, meaning it makes the live cluster match what Git says it should look like.",
      'If a deployment fails, I save the Helm revision, the rendered manifest, the Kubernetes events and logs, and the application metrics before doing anything else. I stop the promotion, roll back to the last known-good artifact or revision, and confirm the rollback actually recovered the service. Only then do I dig into whether the real cause was the pipeline, the chart, a health probe, capacity, a permission, or the application itself — and fix that before retrying.',
    ],
    code: [
      {
        title: 'Jenkins to Kubernetes flow',
        language: 'text',
        code: `Git push/webhook → Jenkins checkout → test and security gates
→ build one image (built once, never changed afterward) → scan/sign/push to registry
→ update Helm/GitOps desired state → rollout → smoke/SLO checks
→ promote or roll back → notify`,
      },
    ],
    tags: ['jenkins', 'kubernetes', 'helm', 'gitops'],
  },
  {
    id: 'itv-myjen-22',
    level: 'basic',
    kind: 'open',
    prompt: 'How does Jenkins handle artifacts?',
    probing:
      'Whether you know archiveArtifacts, fingerprinting, where artifacts live and when to push to a repository.',
    answer: [
      'Jenkins handles artifacts through its built-in artifact management system. When a build is executed, Jenkins can archive files generated during the build process, such as binaries, reports, or logs.',
      'These archived artifacts are stored on the Jenkins server and can be accessed later for download or further processing.',
      'To archive artifacts in Jenkins, you can use the `Archive the artifacts` post-build action in a freestyle project or the `archiveArtifacts` step in a pipeline. You specify the files to be archived using patterns (e.g., `**/target/*.jar` for Java projects).',
      'In a Jenkins pipeline, you can archive artifacts like this:',
      'In this example, after a successful build, Jenkins archives all JAR files located in the target directory. The `fingerprint: true` option enables tracking of the artifact across builds.',
      'You can also retrieve and use these artifacts in subsequent build steps or jobs by using the `Copy Artifacts` plugin or by referencing them directly in your pipeline scripts.',
      'In this example, after building the project with Maven, the resulting JAR files are archived for future use.',
      'Artifacts are stored under `$JENKINS_HOME/jobs/<job-name>/builds/<build-number>/archive/` The fingerprint tracks where an artifact came from and which downstream jobs use it.',
      'For scalability, Jenkins can push artifacts to:',
      '- Nexus Repository\n- JFrog Artifactory\n- AWS S3 / Azure Blob Storage\n- Docker Registry (for container images)',
      'Once archived, artifacts can be downloaded from the Jenkins web interface, used in subsequent build steps, or deployed to external repositories. Jenkins also provides plugins for integrating with artifact repositories like Nexus or Artifactory, allowing for more advanced artifact management and distribution.',
    ],
    code: [
      {
        title: 'Archive JARs after a successful build',
        language: 'text',
        code: `pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                // Build steps here
            }
        }
    }
    post {
        success {
            archiveArtifacts artifacts: '**/target/*.jar', fingerprint: true
        }
    }
}`,
      },
      {
        title: 'Build with Maven and archive the JAR',
        language: 'text',
        code: `pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        sh 'mvn clean package'
      }
    }
    stage('Archive Artifacts') {
      steps {
        archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
      }
    }
  }
}`,
      },
    ],
    tags: ['jenkins', 'artifacts', 'archiveartifacts'],
  },
  {
    id: 'itv-myjen-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you operate and troubleshoot Jenkins day to day?',
    probing:
      'Whether you know the Jenkins operating concepts and a disciplined order for troubleshooting failures.',
    answer: [
      'Concepts worth knowing: jobs, stages, steps, agents/nodes, workspace, credentials, artifacts, plugins, triggers, webhooks, Poll SCM, cron, post-build actions, backups, and UIs like Blue Ocean.',
      "Treat plugins and shared libraries as privileged code, because they can touch credentials and run on every build. Pin versions, test upgrades before rolling them out, restrict who can administer Jenkins, give every identity only the access it actually needs, and keep the controller's configuration in code so it can be restored.",
      "When something fails, work through this order: find the first stage that failed and read its logs, check the agent's health and label, check the workspace, check dependency and tool versions, check what the credentials are scoped to, check network and registry access, check disk/memory/executor capacity, and look at whatever plugin or `Jenkinsfile` changed most recently. Turn on timestamps in the logs, and keep the test and scan results around for comparison.",
      'Cleanup steps belong in `post { always { ... } }`. Never let a password show up in a Groovy string or in the console log.',
    ],
    tags: ['jenkins', 'operations', 'troubleshooting'],
  },
]
