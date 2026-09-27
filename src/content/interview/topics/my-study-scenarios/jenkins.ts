import type { InterviewQuestion } from '../../../types'

/** Jenkins operations: HA, the troubleshooting runbook, DR, GitHub integration and optimisation. */
export const myStudyScenariosJenkinsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystsc-23',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you make Jenkins highly available?',
    probing:
      'Whether you know Jenkins has no active-active controllers and design for controller resilience, durable state, redundant agents and backups.',
    answer: [
      'Standard Jenkins does not provide active-active controller clustering like some other clustered platforms. Don\'t say "run two Jenkins masters against the same `JENKINS_HOME`" - that\'s not how Jenkins works, and doing it risks corrupting state.',
      'A good Jenkins HA/DR design instead focuses on:',
      '- Reliable Jenkins controller infrastructure\n- Durable Jenkins state\n- Backups\n- Multiple build agents\n- Monitoring\n- Disaster recovery',
      '`JENKINS_HOME` contains all the critical Jenkins state:',
      'Use durable storage for `JENKINS_HOME` and take regular backups. Do **not** run multiple active controllers against the same `JENKINS_HOME` - only one controller process should own it at a time.',
      "Use multiple agents so a single agent failure doesn't stop builds:",
      "If one agent fails, Jenkins can schedule builds on another. Combine this with Pipeline as Code (Jenkinsfiles stored in Git) so the pipeline definition itself isn't a single point of failure either. Monitor:",
      '- Jenkins availability\n- CPU/memory\n- Disk\n- Executor utilization\n- Queue length\n- Agent availability\n- Build failures\n- Jenkins logs',
      '**Key interview point:** Jenkins HA is not "multiple active controllers." Think controller resilience + durable state + redundant agents + backup/DR.',
    ],
    code: [
      {
        title: 'Jenkins HA',
        language: 'text',
        code: `Users
  |
  v
Load Balancer / DNS
  |
  v
Jenkins Controller
  |
  v
Durable Jenkins storage
  |
  v
Jenkins Agents`,
      },
      {
        title: 'JENKINS_HOME contains all the critical Jenkins state',
        language: 'text',
        code: `jobs/
plugins/
credentials/
users/
nodes/
secrets/
config.xml`,
      },
      {
        title: 'Jenkins HA (2)',
        language: 'text',
        code: `Controller
  ├── Agent 1
  ├── Agent 2
  └── Agent 3`,
      },
    ],
    followUps: [
      'What would you put in JENKINS_HOME backups, and what would you exclude?',
      'How does Jenkins Configuration as Code help recovery?',
    ],
    tags: ['jenkins', 'high availability'],
  },
  {
    id: 'itv-mystsc-24',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A Jenkins pipeline is slow. How do you troubleshoot it?',
    probing:
      'Whether you find the slow stage first and then check agent resources and external dependencies before optimising.',
    answer: [
      'Check each stage in turn - checkout, build, unit tests, Docker build, security scan, deployment - and whether Maven/npm/PyPI/Docker registry/SonarQube performance is the actual bottleneck. Useful commands: `top`, `free -m`, `df -h`, `iostat`.',
      "**Interview answer:** first use Stage View or Blue Ocean to identify the slow stage, then check logs and the agent's CPU/memory/disk/network. Check external dependencies - if repeated dependency downloads are the issue, add caching; if the agent is overloaded, move the build or increase capacity.",
    ],
    code: [
      {
        title: 'Slow pipeline',
        language: 'text',
        code: `Pipeline slow
  |
  v
Check Stage View
  |
  v
Identify slow stage
  |
  v
Check agent availability
  |
  v
Check CPU / Memory / Disk
  |
  v
Check build logs
  |
  v
Check external dependencies
  |
  v
Optimize bottleneck`,
      },
    ],
    tags: ['jenkins', 'performance', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-25',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A Jenkins pipeline is stuck in the queue. How do you troubleshoot it?',
    probing:
      'Whether you read the queue reason and check labels, agents and executors in a logical order.',
    answer: [
      "Common causes: no suitable agent, a required label doesn't exist, matching agents are offline, or all executors are busy.",
      "**Interview answer:** check the queue item's reason, whether a suitable agent is online, whether it has a free executor, and whether the label in the pipeline matches an available agent.",
    ],
    code: [
      {
        title: 'Stuck in queue',
        language: 'text',
        code: `Build queued
  |
  v
Check queue reason
  |
  v
Check available agents
  |
  v
Check labels
  |
  v
Check executors
  |
  v
Check agent connectivity
  |
  v
Check resource constraints`,
      },
    ],
    tags: ['jenkins', 'agents', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-26',
    level: 'basic',
    kind: 'scenario',
    prompt:
      'A Jenkins job is stuck on "Waiting for Executor". What does it mean and how do you fix it?',
    probing:
      'Whether you know what an executor is and avoid the trap of blindly increasing executor counts.',
    answer: [
      'Meaning: Jenkins has no suitable executor available right now.',
      'Check: required label, matching agent, agent online status, free executor.',
      'Fix: add another agent, increase executor count carefully, free stuck builds, correct labels, bring agents online.',
      "**Don't blindly increase executors.** If a VM has 2 CPUs and 4 GB RAM, 10 heavy executors will make builds slower, not faster - executors share the same finite CPU/memory.",
    ],
    tags: ['jenkins', 'executors', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-27',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Jenkins is running out of memory. How do you troubleshoot it?',
    probing:
      'Whether you locate the OOM (controller, agent or build) and fix the workload rather than only raising heap.',
    answer: [
      'First determine where the OOM is happening:',
      '- Jenkins controller JVM\n- Build agent\n- Individual build process',
      'Common causes: too many concurrent builds, large pipelines, memory-heavy Maven/Gradle builds, large Docker builds, too many plugins, memory leaks, too many executors.',
      'Fix: increase JVM heap appropriately (e.g. `-Xms2g -Xmx4g`), move builds to agents, reduce concurrency, tune build-tool memory, remove unnecessary plugins, restart only as a temporary mitigation.',
      "**Don't just keep increasing heap if the underlying workload is wrong** - that treats the symptom, not the cause.",
    ],
    code: [
      {
        title: 'Jenkins OOM: Useful checks',
        language: 'bash',
        code: `ps -ef | grep jenkins
free -m
dmesg | grep -i "out of memory"`,
      },
      {
        title: 'Jenkins OOM: Look for',
        language: 'text',
        code: `java.lang.OutOfMemoryError: Java heap space
java.lang.OutOfMemoryError: Metaspace`,
      },
    ],
    followUps: [
      'How would you take and analyse a heap dump of the Jenkins controller?',
      'Why should builds not run on the controller at all?',
    ],
    tags: ['jenkins', 'memory', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-28',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Jenkins jobs are failing randomly. How do you troubleshoot it?',
    probing:
      'Whether you treat flaky builds as a pattern to find - comparing good and bad runs - rather than rerunning until green.',
    answer: [
      '"Random" failures are usually caused by nondeterministic external conditions, not truly random code.',
      'Compare a successful build against a failed one: same agent? same tool version? same dependency versions? same time of day? same environment? same network dependency?',
      'Check: agent disconnects, CPU/memory exhaustion, disk full, Docker registry timeout, Maven repository timeout, Git failures, Azure API timeouts, race conditions, shared workspace/files, shared Docker tags/resources.',
      'Useful: `df -h`, `free -m`, `uptime`, `dmesg`.',
      '**Strong approach:** compare successful and failed builds, identify the common pattern, reproduce the failure, and fix the underlying issue rather than repeatedly rerunning the job and hoping it passes.',
    ],
    followUps: [
      'How would you detect race conditions caused by shared workspaces or Docker tags?',
      'When is an automatic retry acceptable, and when does it hide a real problem?',
    ],
    tags: ['jenkins', 'flaky builds', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-29',
    level: 'intermediate',
    kind: 'scenario',
    prompt:
      'Jenkins jobs are failing because of missing dependencies such as `mvn: command not found`. How do you troubleshoot and fix it?',
    probing:
      "Whether you check the agent's tools and PATH, and know long-term fixes like tool configuration and container-based agents.",
    answer: [
      'Identify which dependency is missing, e.g.:',
      'Common causes: dependency not installed, incorrect `PATH`, wrong tool version, a Jenkins tool-configuration problem, a Docker socket permission issue, or an agent that was recreated without the required tools.',
      'Better long-term solutions: Jenkins tool configuration (auto-install), Docker-based agents, Kubernetes dynamic agents, prebuilt agent images - so "what\'s installed on this agent" stops being a manual, driftable state.',
    ],
    code: [
      {
        title: 'Identify which dependency is missing, e.g.',
        language: 'text',
        code: `npm: command not found
mvn: command not found
python: command not found
docker: command not found`,
      },
      {
        title: 'Check the agent',
        language: 'bash',
        code: `which java
which git
which docker
which python
which mvn`,
      },
      {
        title: 'Check versions',
        language: 'bash',
        code: `java -version
git --version
docker --version
python --version
mvn --version`,
      },
    ],
    tags: ['jenkins', 'agents', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-30',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A Jenkins plugin is failing. How do you troubleshoot it?',
    probing:
      'Whether you read the logs for the failing plugin and check version, dependency and Java compatibility before rolling back.',
    answer: [
      'Look for: `Failed Loading Plugin`, `NoSuchMethodError`, `ClassNotFoundException`, `UnsupportedClassVersionError`.',
      'If the failure started after a Jenkins/plugin/Java upgrade, compare against the previous known-good versions. Test plugin upgrades in a non-production Jenkins instance first.',
    ],
    code: [
      {
        title: 'Plugin failure',
        language: 'text',
        code: `Plugin failure
  |
  v
Check Jenkins logs
  |
  v
Identify plugin
  |
  v
Check plugin version
  |
  v
Check dependencies
  |
  v
Check Jenkins/Java compatibility
  |
  v
Rollback/update plugin
  |
  v
Restart Jenkins if required`,
      },
    ],
    tags: ['jenkins', 'plugins', 'troubleshooting'],
  },
  {
    id: 'itv-mystsc-31',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design disaster recovery for Jenkins?',
    probing:
      'Whether you treat JENKINS_HOME as critical state, know RPO/RTO, keep backups off the server and test restores.',
    answer: [
      'DR means that if the Jenkins controller or its infrastructure is lost, Jenkins can be restored quickly enough to continue CI/CD. The core principle: **`JENKINS_HOME` is critical state.**',
      'Backup storage can be Azure Blob Storage or another durable external store - do **not** keep the only backup on the Jenkins server itself.',
      'What to back up: job configurations, pipeline configurations (if not already in Git), Jenkins configuration, credentials and secrets, plugin information, user configuration, node/agent configuration, and any other required Jenkins metadata.',
      'Use: automated backups, external storage, a separate-region copy where appropriate, retention policies, immutability where required, and periodic restore testing.',
      '**RPO (Recovery Point Objective)** - how much data loss is acceptable. Example: RPO = 1 hour means the recovery point should be no more than roughly an hour old.',
      '**RTO (Recovery Time Objective)** - how quickly Jenkins needs to be restored. Example: RTO = 2 hours means Jenkins should be back up within 2 hours.',
      'Make Jenkins reproducible so recovery isn\'t just "restore a tarball": Jenkins Configuration as Code, Terraform/Bicep for the infrastructure, Ansible for host configuration, and Jenkinsfiles in Git for the pipelines themselves.',
      'Test the DR process periodically - an untested backup is not a verified recovery path.',
      '**HA vs DR:** HA minimizes downtime from an infrastructure failure (agents/controller resilience while things are still mostly working). DR restores Jenkins after a major failure or total loss.',
    ],
    code: [
      {
        title: 'Jenkins DR',
        language: 'text',
        code: `Primary Region
  |
  v
Jenkins Controller
  |
  v
JENKINS_HOME
  ├── Backup Storage
  └── Agents`,
      },
      {
        title: 'Jenkins DR: Recovery flow',
        language: 'text',
        code: `Jenkins Primary Failed
  |
  v
Declare DR
  |
  v
Provision new Jenkins infrastructure
  |
  v
Install Jenkins
  |
  v
Restore Jenkins data/configuration
  |
  v
Restore required secrets
  |
  v
Connect agents
  |
  v
Run smoke test
  |
  v
Resume CI/CD`,
      },
    ],
    followUps: [
      'How often would you test a Jenkins restore, and what would the smoke test check?',
      'How do you restore credentials securely in a new region?',
    ],
    tags: ['jenkins', 'disaster recovery', 'backup'],
  },
  {
    id: 'itv-mystsc-32',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you integrate Jenkins with GitHub?',
    probing:
      'Whether you know webhooks, GitHub App authentication, Multibranch Pipelines and using status checks as a merge gate.',
    answer: [
      '**Authenticating to GitHub** - configure repository access in Jenkins using one of:',
      '- GitHub App\n- Personal Access Token\n- SSH key',
      "For production, a **GitHub App is generally preferable** to a personal developer token because its permissions can be scoped precisely (specific repos, specific permissions) and it isn't tied to one person's account.",
      "**Setting up the job:**\n**Multibranch Pipeline** is preferred for real projects - Jenkins automatically discovers branches that contain a Jenkinsfile, so you don't manually create a job per branch.",
      '**PR flow:**\nBranch protection rules in GitHub can require the Jenkins check to pass before a PR is mergeable, turning the pipeline into an actual merge gate rather than just a notification.',
      "**Don't hardcode credentials:**\nUse Jenkins Credentials (or an external secret manager) instead, and reference the credential ID rather than the literal secret.",
      '**Direction matters:**',
      '- **GitHub → Jenkins:** webhooks, source checkout, PR/branch events, build triggering.\n- **Jenkins → GitHub:** build status, PR checks, API operations (e.g. posting a commit status).',
    ],
    code: [
      {
        title: 'Jenkins and GitHub',
        language: 'text',
        code: `Developer
  |
  v
GitHub Repository
  |
  v
Webhook
  |
  v
Jenkins
  |
  v
Jenkinsfile
  |
  v
Checkout -> Build -> Test -> Scan -> Docker Build
  |
  v
Registry
  |
  v
Deployment`,
      },
      {
        title: 'Setting up the job',
        language: 'text',
        code: `Jenkins Dashboard -> New Item -> Pipeline`,
      },
      {
        title: 'For production',
        language: 'text',
        code: `Pipeline
  -> Definition: Pipeline script from SCM
  -> SCM: Git
  -> Repository: <GitHub repository>
  -> Credentials
  -> Branch
  -> Script Path: Jenkinsfile`,
      },
      {
        title: 'Multibranch Pipeline',
        language: 'text',
        code: `main
develop
feature/login
feature/payment`,
      },
      {
        title: 'PR flow',
        language: 'text',
        code: `Developer creates PR
  |
  v
GitHub webhook
  |
  v
Jenkins
  |
  v
Checkout PR
  |
  v
Build
  |
  v
Unit tests
  |
  v
SonarQube/security scan
  |
  v
Result reported to GitHub
  |
  v
Branch protection can require successful checks`,
      },
      {
        title: "Don't hardcode credentials",
        language: 'text',
        code: `// Bad
sh "docker login -u admin -p <password>"`,
      },
    ],
    tags: ['jenkins', 'github', 'webhooks'],
  },
  {
    id: 'itv-mystsc-33',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you optimise a slow Jenkins pipeline?',
    probing:
      'Whether you measure the bottleneck first and then apply parallel stages, caching, conditional stages, better agents and Docker tuning.',
    answer: [
      'Main goals: reduce build time, avoid unnecessary work, use resources efficiently, improve reliability. Always identify the bottleneck first, using Stage View and logs, rather than optimizing blind:',
      '**1. Parallel stages** - run independent stages concurrently instead of serially:',
      '**2. Caching** - Maven, npm, Python packages, Docker layers. Avoids re-downloading the same dependencies on every build.',
      '**3. Avoid unnecessary builds** based on branch type:',
      "**4. Dedicated/lightweight agents** - don't run builds on the controller itself.",
      '**5. Docker optimization:**',
      '- Multi-stage builds\n- Smaller base images where appropriate\n- `.dockerignore`\n- Layer caching\n- BuildKit/build cache',
      "**6. Conditional stages** - skip stages that don't apply to this branch:",
      '**7. Optimize Git** - shallow clone, sparse checkout where appropriate, Git mirrors/caching for large repositories: `git clone --depth 1 <repository>`',
      '**8. Control executors based on actual CPU/memory.** More executors does not automatically mean better performance - see the Jenkins OOM and "Waiting for Executor" notes.',
      '**9. Use artifact repositories** such as ACR, Nexus, or Artifactory. Build once and deploy the same artifact to higher environments, rather than rebuilding per environment.',
      '**10. Fail fast** - order stages so cheap/likely-to-fail checks run before expensive ones:',
      "**11. Clean workspaces carefully:**\nDon't destroy useful caches unnecessarily - a workspace clean that also wipes a dependency cache defeats the point of caching in the first place.",
      '**Key five interview points:** parallel execution + caching + conditional stages + optimized agents + Docker optimization.',
    ],
    code: [
      {
        title: 'Optimization',
        language: 'text',
        code: `Checkout      -> 30 sec
Build         -> 3 min
Unit tests    -> 8 min
SonarQube     -> 2 min
Docker build  -> 10 min`,
      },
      {
        title: '1. Parallel stages',
        language: 'text',
        code: `stage('Validation') {
    parallel {
        stage('Unit Tests') {
            steps {
                sh 'mvn test'
            }
        }
        stage('Security Scan') {
            steps {
                sh './security-scan.sh'
            }
        }
    }
}`,
      },
      {
        title: '3. Avoid unnecessary builds based on branch type',
        language: 'text',
        code: `Feature branch -> build/test
PR             -> build/test/scan
main           -> full CI/CD/deployment`,
      },
      {
        title: '6. Conditional stages',
        language: 'text',
        code: `stage('Deploy Production') {
    when {
        branch 'main'
    }
    steps {
        sh './deploy.sh'
    }
}`,
      },
      {
        title: '10. Fail fast',
        language: 'text',
        code: `Checkout -> Lint -> Unit tests -> Build -> Security scan -> Docker build -> Deploy`,
      },
      {
        title: '11. Clean workspaces carefully',
        language: 'text',
        code: `post {
    always {
        cleanWs()
    }
}`,
      },
    ],
    followUps: [
      'How would you cache Maven or npm dependencies on ephemeral Kubernetes agents?',
      'How do you decide what can run in parallel?',
    ],
    tags: ['jenkins', 'performance', 'optimization'],
  },
  {
    id: 'itv-mystsc-34',
    level: 'basic',
    kind: 'open',
    prompt: 'Where do you write a Jenkins Declarative Pipeline?',
    probing:
      'Whether you know the UI script option is for quick tests and real projects use a Jenkinsfile from SCM.',
    answer: [
      '**Quick/test method** - write it directly in the Jenkins UI:',
      '**Recommended real-project approach** - store a `Jenkinsfile` in Git alongside the application:',
      'Then configure the job to read it from source control:',
      '**Interview answer:** for a quick test, write it directly as a Pipeline script in the UI. For real projects, use "Pipeline script from SCM" so the Jenkinsfile is version-controlled, reviewable, and travels with the application code.',
    ],
    code: [
      {
        title: 'Quick/test method - write it directly in the Jenkins UI',
        language: 'text',
        code: `Jenkins Dashboard -> New Item -> Pipeline -> OK
  -> Pipeline -> Definition -> Pipeline script`,
      },
      {
        title: 'Quick/test method',
        language: 'text',
        code: `pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building application'
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying application'
            }
        }
    }
}`,
      },
      {
        title: 'Recommended real-project approach',
        language: 'text',
        code: `my-application/
├── src/
├── Dockerfile
└── Jenkinsfile`,
      },
      {
        title: 'Then configure the job to read it from source control',
        language: 'text',
        code: `Jenkins Dashboard -> New Item -> Pipeline
  -> Pipeline
  -> Definition: Pipeline script from SCM
  -> SCM: Git
  -> Repository
  -> Credentials
  -> Branch
  -> Script Path: Jenkinsfile`,
      },
    ],
    tags: ['jenkins', 'jenkinsfile', 'pipelines'],
  },
]
