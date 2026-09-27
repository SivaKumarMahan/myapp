import type { InterviewQuestion } from '../../../types'

/** Branching strategy, the CI/CD flow and sample pipelines in four tools. */
export const myFrequentPipelineQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myfaq-41',
    level: 'basic',
    kind: 'open',
    prompt: 'What branching strategy do you follow in your project?',
    probing:
      'A simple, defensible strategy: protected main, short-lived feature branches, everything through pull requests.',
    answer: [
      'I normally use a simple trunk-based strategy. The `main` branch is always kept stable, and developers create short-lived feature branches for their work.',
      '**Create a feature branch.** The developer makes a small change, tests it locally, and pushes the branch.',
      '**Open a pull request.** The feature branch is merged into `main` only through a pull request. The pull request checks:',
      '- Unit tests.\n- Code quality.\n- Security scanning.\n- Build success.\n- Review approval.',
      'Direct pushes to `main` are blocked using branch protection.',
      '**Merge small changes.** I prefer small pull requests because they are easier to review, test, and roll back. After approval and successful checks, the change is merged into `main`. The feature branch is then deleted because its work is complete.',
    ],
    code: [
      {
        title: 'Branch layout',
        language: 'text',
        code: `main
  ├── feature/login
  ├── feature/payment
  └── hotfix/production-error`,
      },
      {
        title: 'Create a feature branch',
        language: 'bash',
        code: `git checkout main
git pull
git checkout -b feature/login`,
      },
      {
        title: 'Commit and push',
        language: 'bash',
        code: `git add .
git commit -m "Add login validation"
git push -u origin feature/login`,
      },
    ],
    tags: ['git', 'branching', 'pull requests'],
  },
  {
    id: 'itv-myfaq-42',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does your branching strategy ensure safe Production deployments?',
    probing:
      'Linking branching to delivery: build once from main, promote the same artifact, gate Production.',
    answer: [
      '**Build once.** The pipeline builds one container image from the merged commit, for example `orders-api:1.4.2`. The same image is promoted through Development, Testing, Staging, and Production. I do not rebuild a different image for each environment.',
      '**Production protection.** Before Production deployment, I use:',
      '- Required approvals.\n- Successful automated tests.\n- A known image tag or digest.\n- A rollback plan.\n- Deployment monitoring.',
      '**Example:** suppose a developer is adding a payment feature. They create `feature/payment`, open a pull request, and pass all checks. After merge, the pipeline builds `payment-api:2.1.0`. That exact image is tested in lower environments and later promoted to Production after approval. If a problem is found, we know the exact commit and image that introduced it, making rollback easier.',
      '**In short:** I use short-lived feature branches with a protected `main` branch. Every change goes through a pull request, automated checks, and review. After merge, the pipeline builds one versioned artifact and promotes the same artifact through all environments. This keeps Production stable and gives us a clear history for auditing and rollback.',
    ],
    code: [
      {
        title: 'From feature branch to Production',
        language: 'text',
        code: `feature branch
-> pull request
-> main
-> build and test
-> Development
-> Testing
-> Staging
-> Production approval
-> Production`,
      },
    ],
    tags: ['git', 'branching', 'release'],
  },
  {
    id: 'itv-myfaq-43',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'There is an urgent Production issue. What is your hotfix workflow?',
    probing:
      'That urgency does not bypass the process: hotfix branch from main, PR, tests, and a normal release.',
    answer: [
      'For an urgent Production issue, I create a hotfix branch from `main`.',
      'The hotfix still goes through a pull request and required tests. After it is merged, the pipeline creates a new release and deploys it through the approved process.',
      'I do not make an untracked change directly in Production.',
    ],
    code: [
      {
        title: 'Create a hotfix branch',
        language: 'bash',
        code: `git checkout main
git pull
git checkout -b hotfix/payment-timeout`,
      },
    ],
    tags: ['git', 'hotfix', 'branching'],
  },
  {
    id: 'itv-myfaq-44',
    level: 'intermediate',
    kind: 'open',
    prompt: 'When would you use a long-lived release branch?',
    probing:
      'Knowing release branches are the exception - for supporting an older version - and that fixes must flow back to main.',
    answer: [
      'Most teams do not need a long-lived release branch. I use one only when a released version must be supported separately while new development continues on `main`, for example `main` alongside `release/2.x`.',
      'A fix made for `release/2.x` must also be merged back into `main` when it is still relevant.',
    ],
    tags: ['git', 'branching', 'release'],
  },
  {
    id: 'itv-myfaq-45',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain the end-to-end CI/CD workflow used in your project.',
    probing:
      'A clear sequence from PR to monitored Production, with one versioned image promoted and a rollback path.',
    answer: [
      'CI/CD automates the process from a code change to a safe deployment.',
      '- **Continuous Integration (CI):** Build, test, scan, and package the application.\n- **Continuous Delivery/Deployment (CD):** Deploy the approved application version to each environment.',
      '**1. Code change and pull request.** The developer works on a short-lived feature branch and opens a pull request. The pipeline checks unit tests, code quality, dependency and secret scanning, and the application build. The change is merged only after the checks and review pass.',
      '**2. Build one versioned image.** After merge, the pipeline builds a container image. I use a unique version or commit ID, not `latest`. The same tested image is promoted to every environment.',
      '**3. Deploy to a lower environment.** The pipeline deploys the image using Helm. It then runs a basic test to confirm that the application is reachable.',
      '**4. Production approval.** Production deployment requires approval. The approver can see the image version, test and scan results, change details, and the rollback plan.',
      '**5. Deploy and verify.** After deployment, I check Pod readiness, logs, application response, error rate, and response time. If the deployment fails, I restore the previous release with `helm rollback`.',
      "**Secrets.** Passwords and tokens are stored in the CI/CD platform's protected secret store or in Azure Key Vault. They are not written directly in pipeline YAML or printed in logs. Where possible, I use short-lived identity-based authentication instead of a saved username and password.",
      '**Example:** suppose commit `a1b2c3` is merged into `main`. The pipeline tests it, builds `orders-api:a1b2c3`, scans it, and pushes it to the registry. That same image is deployed to Development and tested. After approval, it is promoted to Production and monitored.',
      '**In short:** my CI/CD flow starts with a pull request and automated checks. After merge, the pipeline builds and scans one versioned image, deploys it to a lower environment, and promotes the same image to Production after approval. I verify the rollout and keep the previous Helm revision available for rollback.',
    ],
    code: [
      {
        title: 'CI/CD flow',
        language: 'text',
        code: `Developer pushes code
-> pull request checks
-> merge to main
-> build and test
-> security scan
-> build container image
-> push image to registry
-> deploy to Development
-> test
-> approval
-> deploy to Production
-> verify and monitor`,
      },
      {
        title: 'Build and push one versioned image',
        language: 'bash',
        code: `docker build -t <registry>/orders-api:<version> .
docker push <registry>/orders-api:<version>`,
      },
      {
        title: 'Deploy to Development with Helm',
        language: 'bash',
        code: `helm upgrade --install orders-api ./helm/orders-api \\
  --namespace development \\
  --set image.tag=<version> \\
  --wait`,
      },
      {
        title: 'Deploy to Production and verify',
        language: 'bash',
        code: `helm upgrade --install orders-api ./helm/orders-api \\
  --namespace production \\
  --set image.tag=<version> \\
  --wait

kubectl rollout status deployment/orders-api -n production`,
      },
      {
        title: 'Roll back',
        language: 'bash',
        code: `helm rollback orders-api <revision> -n production`,
      },
    ],
    followUps: [
      'How do you make sure Production gets exactly the image that was tested?',
      'What would you add to this flow for a database migration?',
    ],
    tags: ['ci/cd', 'pipeline', 'helm'],
  },
  {
    id: 'itv-myfaq-46',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Walk through a Jenkins pipeline for a React + Spring Boot app deployed to AKS.',
    probing:
      'Reading a declarative Jenkinsfile: stage order, failure behaviour, approval with input/timeout, credentials handling.',
    answer: [
      'This mirrors the same nine stages as the Azure DevOps pipeline for the same React + Spring Boot app: build, test, SonarQube, Docker build, Trivy scan, push to ACR, deploy to Development, Production approval, deploy to Production.',
      'Because a Jenkins declarative pipeline runs all stages on the same agent workspace by default, the image built in one stage is still there for later stages - no artifact hand-off is needed.',
      "The stages run in order - if any stage fails, the pipeline stops and later stages don't run. `input` in the **Production Approval** stage is Jenkins's equivalent of Azure DevOps's `ManualValidation@1`: it pauses the pipeline and waits for a named approver, and `timeout` auto-rejects it if nobody responds in 24 hours.",
      'Registry and cluster credentials come from the Jenkins credential store (`withCredentials`), not hardcoded values.',
    ],
    code: [
      {
        title: 'Jenkinsfile',
        language: 'text',
        code: `pipeline {
  agent any

  environment {
    ACR_NAME   = 'myacr'
    IMAGE_NAME = 'payment-api'
    IMAGE_TAG  = "\${env.BUILD_NUMBER}"
    AKS_DEV    = 'aks-dev'
    AKS_PROD   = 'aks-prod'
    NAMESPACE  = 'payment'
  }

  stages {

    stage('Build React and Spring Boot') {
      steps {
        dir('frontend') {
          sh 'npm install'
          sh 'npm run build'
        }
        dir('backend') {
          sh './mvnw clean package -DskipTests'
        }
      }
    }

    stage('Run Tests') {
      steps {
        dir('backend') {
          sh './mvnw test'
        }
        dir('frontend') {
          sh 'npm test -- --watchAll=false'
        }
      }
    }

    stage('SonarQube Analysis') {
      steps {
        dir('backend') {
          withSonarQubeEnv('SonarQube-Service-Connection') {
            sh './mvnw verify sonar:sonar -Dsonar.projectKey=payment-api'
          }
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        sh "docker build -t \${IMAGE_NAME}:\${IMAGE_TAG} -f backend/Dockerfile backend"
      }
    }

    stage('Trivy Security Scan') {
      steps {
        sh "trivy image --severity HIGH,CRITICAL --exit-code 1 \${IMAGE_NAME}:\${IMAGE_TAG}"
      }
    }

    stage('Push Image to ACR') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'ACR-Credentials', usernameVariable: 'ACR_USER', passwordVariable: 'ACR_PASS')]) {
          sh """
            echo \\$ACR_PASS | docker login \${ACR_NAME}.azurecr.io -u \\$ACR_USER --password-stdin
            docker tag \${IMAGE_NAME}:\${IMAGE_TAG} \${ACR_NAME}.azurecr.io/\${IMAGE_NAME}:\${IMAGE_TAG}
            docker push \${ACR_NAME}.azurecr.io/\${IMAGE_NAME}:\${IMAGE_TAG}
          """
        }
      }
    }

    stage('Deploy to Development') {
      steps {
        sh "az aks get-credentials --resource-group myResourceGroup --name \${AKS_DEV} --overwrite-existing"
        sh """
          helm upgrade --install payment-api ./helm/payment-api \\
            --namespace \${NAMESPACE} \\
            --create-namespace \\
            --set image.repository=\${ACR_NAME}.azurecr.io/\${IMAGE_NAME} \\
            --set image.tag=\${IMAGE_TAG} \\
            --wait
        """
      }
    }

    stage('Production Approval') {
      steps {
        timeout(time: 24, unit: 'HOURS') {
          input message: 'Approve deployment to Production?', submitter: 'devops-team'
        }
      }
    }

    stage('Deploy to Production') {
      steps {
        sh "az aks get-credentials --resource-group myResourceGroup --name \${AKS_PROD} --overwrite-existing"
        sh """
          helm upgrade --install payment-api ./helm/payment-api \\
            --namespace \${NAMESPACE} \\
            --create-namespace \\
            --set image.repository=\${ACR_NAME}.azurecr.io/\${IMAGE_NAME} \\
            --set image.tag=\${IMAGE_TAG} \\
            --wait
        """
      }
    }
  }
}`,
      },
    ],
    tags: ['jenkins', 'ci/cd', 'aks'],
  },
  {
    id: 'itv-myfaq-47',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Walk through an Azure DevOps multi-stage pipeline for a React + Spring Boot app deployed to AKS.',
    probing:
      'Understanding stages, dependsOn, deployment jobs, environments, the agentless approval job and why the same tag reaches Production.',
    answer: [
      'This is a more complete, real-world pipeline for a React + Spring Boot application. It builds both parts of the app, runs tests, checks code quality, builds and scans a Docker image, pushes it to Azure Container Registry (ACR), and then deploys to AKS Dev and AKS Production with a manual approval gate in between.',
      "A top-level `pool: vmImage: 'ubuntu-latest'` sets the default agent for every job. The Approval stage overrides it with `pool: server`, since manual validation runs on Azure DevOps's built-in agentless pool, not a VM.",
      'Each `stage` runs only after the one before it finishes successfully, because of `dependsOn`. If one stage fails, the pipeline stops there and nothing later runs.',
      "1. **Build** - Compiles both halves of the app: the React frontend (`npm install` + `npm run build`) and the Spring Boot backend (`./mvnw clean package`).\n2. **Test** - Runs the backend unit tests (`./mvnw test`) and the frontend tests (`npm test`). This is separate from Build so test failures are easy to spot.\n3. **SonarQube** - Scans the code for bugs, code smells, and coverage gaps, and publishes the results back to Azure DevOps.\n4. **Docker Build** - Packages the backend into a Docker image, tagged with the Azure DevOps build ID (`$(Build.BuildId)`) so every image is unique and traceable back to a build.\n5. **Trivy Scan** - Scans the built image for known vulnerabilities. `--exit-code 1` means the pipeline fails if a HIGH or CRITICAL issue is found, so a vulnerable image never moves forward.\n6. **Push to ACR** - Only after the image passes the security scan, it is pushed to Azure Container Registry.\n7. **Deploy to Dev** - First fetches AKS credentials with `az aks get-credentials`, then runs `helm upgrade --install` to deploy (or update) the `payment-api` chart on the Dev cluster, pointing at the image that was just pushed. `--wait` makes the step block until the rollout is healthy.\n8. **Approval** - A manual gate. It pauses the pipeline and emails the DevOps team; someone must approve before Production deployment can start. If nobody responds in time, `onTimeout: 'reject'` stops the pipeline.\n9. **Deploy to Prod** - Runs only after approval, and repeats the same `az aks get-credentials` + `helm upgrade --install` pattern against the Production cluster, using the exact same image tag. This matters: it's not a rebuild, it's the same tested artifact that went to Dev.",
      'The key idea: build one image, scan it, and promote that same image through Dev and then Production, with a human approval step protecting Production.',
    ],
    code: [
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  acrName: 'myacr'
  imageName: 'payment-api'
  imageTag: '$(Build.BuildId)'
  aksDev: 'aks-dev'
  aksProd: 'aks-prod'
  namespace: 'payment'

stages:

# --------------------------------------------------
# 1. BUILD
# --------------------------------------------------
- stage: Build
  displayName: Build React and Spring Boot
  jobs:
  - job: Build
    steps:

    # React
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'

    - script: |
        cd frontend
        npm install
        npm run build
      displayName: Build React Application

    # Spring Boot
    - task: JavaToolInstaller@0
      inputs:
        versionSpec: '17'
        jdkArchitectureOption: 'x64'
        jdkSourceOption: 'PreInstalled'

    - script: |
        cd backend
        ./mvnw clean package -DskipTests
      displayName: Build Spring Boot Application


# --------------------------------------------------
# 2. TEST
# --------------------------------------------------
- stage: Test
  displayName: Run Tests
  dependsOn: Build
  jobs:
  - job: Test
    steps:

    - script: |
        cd backend
        ./mvnw test
      displayName: Run Spring Boot Tests

    - script: |
        cd frontend
        npm test -- --watchAll=false
      displayName: Run React Tests


# --------------------------------------------------
# 3. SONARQUBE
# --------------------------------------------------
- stage: SonarQube
  displayName: SonarQube Analysis
  dependsOn: Test
  jobs:
  - job: SonarQube
    steps:

    - task: SonarQubePrepare@7
      inputs:
        SonarQube: 'SonarQube-Service-Connection'
        scannerMode: 'cli'
        configMode: 'manual'
        cliProjectKey: 'payment-api'
        cliProjectName: 'payment-api'

    - script: |
        cd backend
        ./mvnw verify sonar:sonar
      displayName: Run SonarQube Scan

    - task: SonarQubePublish@7
      inputs:
        pollingTimeoutSec: '300'


# --------------------------------------------------
# 4. DOCKER BUILD
# --------------------------------------------------
- stage: DockerBuild
  displayName: Build Docker Image
  dependsOn: SonarQube
  jobs:
  - job: DockerBuild
    steps:

    - task: Docker@2
      displayName: Build Docker Image
      inputs:
        command: build
        repository: $(imageName)
        Dockerfile: 'backend/Dockerfile'
        tags: |
          $(imageTag)


# --------------------------------------------------
# 5. TRIVY SCAN
# --------------------------------------------------
- stage: TrivyScan
  displayName: Scan Docker Image
  dependsOn: DockerBuild
  jobs:
  - job: Trivy
    steps:

    - script: |
        trivy image \\
          --severity HIGH,CRITICAL \\
          --exit-code 1 \\
          $(imageName):$(imageTag)
      displayName: Trivy Security Scan


# --------------------------------------------------
# 6. PUSH IMAGE TO ACR
# --------------------------------------------------
- stage: PushACR
  displayName: Push Image to ACR
  dependsOn: TrivyScan
  jobs:
  - job: Push
    steps:

    - task: Docker@2
      displayName: Login and Push to ACR
      inputs:
        command: buildAndPush
        repository: $(imageName)
        dockerfile: 'backend/Dockerfile'
        containerRegistry: 'ACR-Service-Connection'
        tags: |
          $(imageTag)


# --------------------------------------------------
# 7. DEPLOY TO DEV
# --------------------------------------------------
- stage: DeployDev
  displayName: Deploy to Development
  dependsOn: PushACR
  jobs:
  - deployment: DeployDev
    environment: 'Dev'
    strategy:
      runOnce:
        deploy:
          steps:

          - task: AzureCLI@2
            displayName: Set AKS Context (Dev)
            inputs:
              azureSubscription: 'AKS-Dev-Service-Connection'
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az aks get-credentials --resource-group myResourceGroup --name $(aksDev) --overwrite-existing

          - script: |
              helm upgrade --install payment-api ./helm/payment-api \\
                --namespace $(namespace) \\
                --create-namespace \\
                --set image.repository=$(acrName).azurecr.io/$(imageName) \\
                --set image.tag=$(imageTag) \\
                --wait
            displayName: Helm Upgrade/Install to AKS Dev


# --------------------------------------------------
# 8. APPROVAL
# --------------------------------------------------
- stage: Approval
  displayName: Production Approval
  dependsOn: DeployDev
  jobs:
  - job: Approval
    pool: server
    steps:
    - task: ManualValidation@1
      inputs:
        notifyUsers: |
          devops-team@company.com
        instructions: |
          Please validate the Dev deployment.
          Approve to continue deployment to Production.
        onTimeout: 'reject'


# --------------------------------------------------
# 9. DEPLOY TO PROD
# --------------------------------------------------
- stage: DeployProd
  displayName: Deploy to Production
  dependsOn: Approval
  condition: succeeded()
  jobs:
  - deployment: DeployProd
    environment: 'Production'
    strategy:
      runOnce:
        deploy:
          steps:

          - task: AzureCLI@2
            displayName: Set AKS Context (Production)
            inputs:
              azureSubscription: 'AKS-Prod-Service-Connection'
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az aks get-credentials --resource-group myResourceGroup --name $(aksProd) --overwrite-existing

          - script: |
              helm upgrade --install payment-api ./helm/payment-api \\
                --namespace $(namespace) \\
                --create-namespace \\
                --set image.repository=$(acrName).azurecr.io/$(imageName) \\
                --set image.tag=$(imageTag) \\
                --wait
            displayName: Helm Upgrade/Install to AKS Production`,
      },
    ],
    traps: [
      'On Microsoft-hosted agents every stage gets a fresh agent, so an image built in the DockerBuild stage is not present in the TrivyScan or PushACR stages. As written, PushACR uses `buildAndPush`, which rebuilds the image. To truly scan and push the same image, build, scan and push in one job (as in the orders-api sample pipeline) or save and publish the image as an artifact.',
    ],
    followUps: [
      'How would you restructure this so the scanned image is exactly the one pushed?',
      'Why put the approval on the Production environment instead of a ManualValidation job?',
    ],
    tags: ['azure devops', 'ci/cd', 'aks'],
  },
  {
    id: 'itv-myfaq-48',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Walk through a GitHub Actions workflow for a React + Spring Boot app deployed to AKS.',
    probing:
      'Knowing each job gets a fresh runner, how to hand an image between jobs, and how environments provide approval.',
    answer: [
      "Same nine stages again, now as GitHub Actions jobs. Unlike Jenkins, each job in GitHub Actions runs on a fresh runner with its own filesystem, so the Docker image built in one job isn't automatically visible to the next.",
      'The pipeline builds the image once, saves it as a workflow artifact, and later jobs download and reuse that same file - so Trivy and ACR are checking and pushing the exact same image, not rebuilding it.',
      'Each job waits for the one before it via `needs`. There\'s no separate "Approval" job here - GitHub Actions handles that through the `environment: Production` protection rule on `deploy-prod`: if that environment is configured in the repo settings with required reviewers, the job pauses and waits for someone to approve it before running, the same effect as the manual validation step in the other two pipelines.',
    ],
    code: [
      {
        title: 'GitHub Actions workflow',
        language: 'yaml',
        code: `name: payment-api-cicd

on:
  push:
    branches: [main]

env:
  ACR_NAME: myacr
  IMAGE_NAME: payment-api
  IMAGE_TAG: \${{ github.run_number }}
  AKS_DEV: aks-dev
  AKS_PROD: aks-prod
  NAMESPACE: payment

jobs:

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm install
          npm run build

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - run: |
          cd backend
          ./mvnw clean package -DskipTests

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd backend
          ./mvnw test
      - run: |
          cd frontend
          npm test -- --watchAll=false

  sonarqube:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd backend
          ./mvnw verify sonar:sonar -Dsonar.projectKey=payment-api
        env:
          SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: \${{ secrets.SONAR_HOST_URL }}

  docker-build:
    needs: sonarqube
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t $IMAGE_NAME:$IMAGE_TAG -f backend/Dockerfile backend
      - run: docker save $IMAGE_NAME:$IMAGE_TAG -o image.tar
      - uses: actions/upload-artifact@v4
        with:
          name: docker-image
          path: image.tar

  trivy-scan:
    needs: docker-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: docker-image
      - run: docker load -i image.tar
      - run: trivy image --severity HIGH,CRITICAL --exit-code 1 $IMAGE_NAME:$IMAGE_TAG

  push-acr:
    needs: trivy-scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: docker-image
      - run: docker load -i image.tar
      - uses: azure/docker-login@v1
        with:
          login-server: \${{ env.ACR_NAME }}.azurecr.io
          username: \${{ secrets.ACR_USERNAME }}
          password: \${{ secrets.ACR_PASSWORD }}
      - run: |
          docker tag $IMAGE_NAME:$IMAGE_TAG $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG
          docker push $ACR_NAME.azurecr.io/$IMAGE_NAME:$IMAGE_TAG

  deploy-dev:
    needs: push-acr
    runs-on: ubuntu-latest
    environment: Dev
    steps:
      - uses: azure/login@v2
        with:
          creds: \${{ secrets.AZURE_CREDENTIALS }}
      - run: az aks get-credentials --resource-group myResourceGroup --name $AKS_DEV --overwrite-existing
      - run: |
          helm upgrade --install payment-api ./helm/payment-api \\
            --namespace $NAMESPACE \\
            --create-namespace \\
            --set image.repository=$ACR_NAME.azurecr.io/$IMAGE_NAME \\
            --set image.tag=$IMAGE_TAG \\
            --wait

  deploy-prod:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: Production
    steps:
      - uses: azure/login@v2
        with:
          creds: \${{ secrets.AZURE_CREDENTIALS }}
      - run: az aks get-credentials --resource-group myResourceGroup --name $AKS_PROD --overwrite-existing
      - run: |
          helm upgrade --install payment-api ./helm/payment-api \\
            --namespace $NAMESPACE \\
            --create-namespace \\
            --set image.repository=$ACR_NAME.azurecr.io/$IMAGE_NAME \\
            --set image.tag=$IMAGE_TAG \\
            --wait`,
      },
    ],
    tags: ['github actions', 'ci/cd', 'aks'],
  },
  {
    id: 'itv-myfaq-49',
    level: 'advanced',
    kind: 'open',
    prompt: 'Write a sample end-to-end pipeline and explain it.',
    probing:
      'That you know the delivery flow is tool-independent, and the non-negotiables: gates, build once, protected identity, rollback.',
    answer: [
      'The syntax changes between tools (Jenkins, Azure DevOps, GitHub Actions, GitLab CI), but the delivery flow stays the same.',
      'The examples are production-oriented but still use placeholders. They assume:',
      '- The application has a working Dockerfile.\n- The Helm chart exists in `helm/orders-api`.\n- The build agent has Maven, Docker, Helm, Azure CLI, `kubectl`, Trivy, and `curl`.\n- SonarQube and OWASP Dependency-Check are configured for the project.\n- Registry and AKS access are configured through a protected identity.\n- Production approval is restricted to authorized users.',
      'I use placeholders such as `<acr-name>` and `<resource-group>` because these values differ by project. All four examples eventually run the same `helm upgrade --install` command. The image version is unique, such as a Git commit or pipeline number. I do not use `latest`.',
      "**Security checks.** A real project normally adds source-code, dependency, secret, container-image and infrastructure scans. A serious finding stops the release. Security tokens are stored in the platform's protected secret store or replaced with identity-based access.",
      '**Build once and promote.** The most important rule is to build the image once. Rebuilding for Production could produce a different image from the one that was tested.',
      '**Rollback.** Check the release history and restore a known working revision. Application rollback must be compatible with any database change.',
      '**Example:** suppose commit `a1b2c3` is merged into `main`. The pipeline runs tests, passes the SonarQube and dependency gates, builds and scans `orders-api:a1b2c3`, and pushes it to ACR. It deploys that image to Development and verifies the rollout and health endpoint. After approval, the same image is deployed and verified in Production. If verification fails, the pipeline stops and the team can restore the previous Helm revision.',
      '**In short:** Jenkins, Azure DevOps, GitHub Actions, and GitLab use different syntax, but my process is the same: test the code, enforce quality and security gates, build and scan one versioned image, deploy and smoke-test it in Development, obtain Production approval, and promote and verify the same image. Identities and secrets are protected, and the previous Helm revision remains available for rollback.',
    ],
    code: [
      {
        title: 'Delivery flow',
        language: 'text',
        code: `checkout
-> build and unit test
-> static analysis and Quality Gate
-> dependency scan
-> build image
-> image scan
-> push image
-> deploy to Development
-> verify and smoke test
-> Production approval
-> deploy the same image to Production
-> verify, smoke test, and monitor`,
      },
      {
        title: 'Common deployment command',
        language: 'bash',
        code: `helm upgrade --install orders-api ./helm/orders-api \\
  --namespace <namespace> \\
  --create-namespace \\
  --set image.repository=<registry>/orders-api \\
  --set image.tag=<version> \\
  --wait`,
      },
      {
        title: 'Security checks',
        language: 'text',
        code: `source-code scan
dependency scan
secret scan
container-image scan
infrastructure scan`,
      },
      {
        title: 'Build once and promote',
        language: 'text',
        code: `orders-api:a1b2c3
-> Development
-> Production approval
-> Production`,
      },
      {
        title: 'Rollback',
        language: 'bash',
        code: `helm history orders-api -n production

helm rollback orders-api <revision> \\
  --namespace production \\
  --wait`,
      },
    ],
    traps: [
      'Putting passwords directly in pipeline files.',
      'Allowing pull-request jobs to use Production credentials.',
      'Deploying the `latest` image tag.',
      'Rebuilding a different image for Production.',
      'Skipping tests because the image built successfully.',
      'Treating a successful Helm command as full application verification.',
      'Allowing overlapping Production deployments.',
      'Rolling back code without checking database compatibility.',
    ],
    followUps: [
      'How do you stop two Production deployments running at the same time in your tool?',
      'Where would you add GitOps or a canary step to this flow?',
    ],
    tags: ['ci/cd', 'pipeline', 'devsecops'],
  },
  {
    id: 'itv-myfaq-50',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Write a production-grade Jenkins declarative pipeline with quality gates and explain it.',
    probing:
      'Command of Jenkins options, Quality Gate webhooks, gated promotion from main, and post actions.',
    answer: [
      '**Explanation of each part:**',
      '- `agent` selects a worker with Maven, Docker, Azure CLI, Helm, `kubectl`, Trivy, and network access to SonarQube.\n- `skipDefaultCheckout(true)` prevents Jenkins from performing an implicit checkout before the explicit `Checkout` stage.\n- `environment` defines values reused in the stages.\n- `Build and Unit Test` compiles, packages, and tests the application. A failed test stops the pipeline.\n- `SonarQube Analysis` checks code quality, bugs, vulnerabilities, duplication, and coverage.\n- `waitForQualityGate` stops delivery when the SonarQube Quality Gate fails. The SonarQube server must have a webhook configured for Jenkins.\n- OWASP Dependency-Check fails the build for dependency findings with a CVSS score of 7 or higher, while Trivy fails it for high or critical findings in the final container image.\n- The immutable image is tagged with the Jenkins build number and pushed only after all pre-deployment checks pass.\n- Helm deploys to Development first. `kubectl rollout status` and the health endpoint verify the release.\n- The Production stages run only from `main`, and `input` pauses for an authorized approval.\n- Production receives the exact image already tested in Development; Jenkins does not rebuild it.\n- `post` publishes JUnit results and archives the dependency report even if a later stage fails. The sample uses the Jenkins Email Extension plugin; Slack or Teams can be used instead.',
      'The Jenkins agent should use managed identity or credentials stored in Jenkins and retrieve application secrets from Azure Key Vault. Secrets must not be hardcoded in the `Jenkinsfile`. In a real project, pin scanner and Maven plugin versions, cache dependencies, publish the packaged artifact or software bill of materials (SBOM), and add secret and Infrastructure-as-Code scanning where applicable.',
      'For safer Production releases, teams can replace direct `helm upgrade` commands with GitOps through Argo CD or Flux and use canary or blue-green deployment strategies. Image tags can also include the Git commit SHA for stronger traceability.',
      '**One-minute interview answer:** This Jenkins Declarative Pipeline checks out the source, builds it, and runs unit tests with Maven. It then performs SonarQube static analysis and blocks the pipeline if the Quality Gate fails. OWASP Dependency-Check scans application dependencies, and Trivy scans the Docker image for high and critical vulnerabilities before the image is pushed to Azure Container Registry. Jenkins deploys that immutable image to Development with Helm, verifies the Kubernetes rollout, and runs a health check. For the `main` branch, an authorized user approves promotion of the same tested image to Production, where Jenkins repeats the rollout and smoke checks. Finally, Jenkins publishes the JUnit reports and sends the configured success or failure notification.',
    ],
    code: [
      {
        title: 'Jenkinsfile',
        language: 'text',
        code: `pipeline {
  agent { label 'docker-azure' }

  options {
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
    timestamps()
    timeout(time: 60, unit: 'MINUTES')
  }

  tools {
    maven 'Maven3'
  }

  environment {
    ACR_NAME = '<acr-name>'
    REGISTRY = '<acr-name>.azurecr.io'
    IMAGE_NAME = 'orders-api'
    IMAGE_TAG = "\${BUILD_NUMBER}"
    SONARQUBE_SERVER = 'SonarQube'
    DEVELOPMENT_RESOURCE_GROUP = '<development-resource-group>'
    DEVELOPMENT_AKS_NAME = '<development-aks-name>'
    PRODUCTION_RESOURCE_GROUP = '<production-resource-group>'
    PRODUCTION_AKS_NAME = '<production-aks-name>'
    DEVELOPMENT_HEALTH_URL = 'https://orders-api-dev.example.com/actuator/health'
    PRODUCTION_HEALTH_URL = 'https://orders.example.com/actuator/health'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build and Unit Test') {
      steps {
        sh 'mvn -B clean verify'
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv("\${SONARQUBE_SERVER}") {
          sh '''
            mvn -B sonar:sonar \\
              -Dsonar.projectKey=orders-api \\
              -Dsonar.projectName=orders-api
          '''
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 10, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Dependency Vulnerability Scan') {
      steps {
        sh '''
          mvn -B org.owasp:dependency-check-maven:check \\
            -DfailBuildOnCVSS=7 \\
            -Dformat=HTML
        '''
      }
    }

    stage('Build Image') {
      steps {
        sh 'docker build -t $REGISTRY/$IMAGE_NAME:$IMAGE_TAG .'
      }
    }

    stage('Scan Image') {
      steps {
        sh '''
          trivy image \\
            --exit-code 1 \\
            --severity HIGH,CRITICAL \\
            $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
        '''
      }
    }

    stage('Push Image') {
      steps {
        sh 'az acr login --name $ACR_NAME'
        sh 'docker push $REGISTRY/$IMAGE_NAME:$IMAGE_TAG'
      }
    }

    stage('Deploy Development') {
      steps {
        sh '''
          az aks get-credentials \\
            --resource-group "$DEVELOPMENT_RESOURCE_GROUP" \\
            --name "$DEVELOPMENT_AKS_NAME" \\
            --overwrite-existing

          helm upgrade --install orders-api ./helm/orders-api \\
            --namespace development \\
            --create-namespace \\
            --set image.repository=$REGISTRY/$IMAGE_NAME \\
            --set image.tag=$IMAGE_TAG \\
            --wait

          kubectl rollout status deployment/orders-api \\
            --namespace development

          curl --fail --show-error --silent \\
            --retry 10 --retry-delay 5 --retry-connrefused \\
            $DEVELOPMENT_HEALTH_URL
        '''
      }
    }

    stage('Approve Production') {
      when {
        branch 'main'
      }
      input {
        message 'Deploy this tested image to Production?'
        ok 'Deploy'
        submitter 'production-approvers'
      }
      steps {
        echo 'Production deployment approved'
      }
    }

    stage('Deploy Production') {
      when {
        branch 'main'
      }
      steps {
        sh '''
          az aks get-credentials \\
            --resource-group "$PRODUCTION_RESOURCE_GROUP" \\
            --name "$PRODUCTION_AKS_NAME" \\
            --overwrite-existing

          helm upgrade --install orders-api ./helm/orders-api \\
            --namespace production \\
            --create-namespace \\
            --set image.repository=$REGISTRY/$IMAGE_NAME \\
            --set image.tag=$IMAGE_TAG \\
            --wait

          kubectl rollout status deployment/orders-api \\
            --namespace production

          curl --fail --show-error --silent \\
            --retry 10 --retry-delay 5 --retry-connrefused \\
            $PRODUCTION_HEALTH_URL
        '''
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'target/surefire-reports/*.xml'
      archiveArtifacts allowEmptyArchive: true,
        artifacts: 'target/dependency-check-report.html'
    }
    success {
      emailext subject: "SUCCESS: \${env.JOB_NAME} #\${env.BUILD_NUMBER}",
        body: "Build details: \${env.BUILD_URL}",
        to: 'devops-team@example.com'
    }
    failure {
      emailext subject: "FAILED: \${env.JOB_NAME} #\${env.BUILD_NUMBER}",
        body: "Build details: \${env.BUILD_URL}",
        to: 'devops-team@example.com'
    }
  }
}`,
      },
      {
        title: 'Pipeline flow',
        language: 'text',
        code: `Checkout
-> Build and unit test
-> SonarQube static analysis
-> Quality Gate
-> Dependency vulnerability scan
-> Build Docker image
-> Scan Docker image
-> Push image to ACR
-> Deploy to Development
-> Verify rollout and run a smoke test
-> Authorized Production approval
-> Deploy the same image to Production
-> Verify rollout and run a smoke test
-> Publish test results and notify the team`,
      },
    ],
    followUps: [
      'What happens to `waitForQualityGate` if the SonarQube webhook is missing?',
      'How would you give this agent Azure access without a stored password?',
    ],
    tags: ['jenkins', 'ci/cd', 'sonarqube'],
  },
  {
    id: 'itv-myfaq-51',
    level: 'advanced',
    kind: 'open',
    prompt: 'Write a production-grade Azure DevOps pipeline with quality gates and explain it.',
    probing:
      'Command of triggers, SonarQube tasks, conditions limiting deploys to main, deployment jobs and protected environments.',
    answer: [
      '**Explanation of each part:**',
      '- `trigger.batch` prevents queued changes from creating overlapping `main` runs, while `pr` validates pull requests.\n- `fetchDepth: 0` gives SonarQube the Git history required for accurate issue attribution.\n- `SonarQubePrepare`, Maven analysis, and `SonarQubePublish` submit the analysis and expose the Quality Gate in the build summary. Waiting for the gate makes a failure stop the pipeline.\n- OWASP Dependency-Check fails for findings with a CVSS score of 7 or higher and publishes its HTML report.\n- The Docker image is scanned with Trivy before `Docker@2` pushes it to ACR.\n- Build and deployment stages run only after a successful Quality stage and only for `main`.\n- Deployment jobs record the environment history, verify the Kubernetes rollout, and call the application health endpoint.\n- Approval and an exclusive-lock check should be configured on the protected `production` Environment in Azure DevOps.\n- Separate workload-identity service connections should isolate Development, Production, and ACR permissions.\n- Azure DevOps notification subscriptions or service hooks can send results to email, Teams, or Slack without embedding notification secrets in YAML.',
      'The `SonarQubePrepare@7` and `SonarQubePublish@7` tasks require the SonarQube Azure DevOps extension and a configured service connection. Pin task and scanner versions according to the versions approved by the organization.',
      '**One-minute interview answer:** This Azure DevOps pipeline builds and tests the Maven application, submits SonarQube analysis, and blocks delivery when the Quality Gate fails. It also scans dependencies with OWASP Dependency-Check. For successful `main` builds, it creates one commit-tagged Docker image, scans it with Trivy, and pushes it to ACR. Deployment jobs promote that same image through Development and the protected Production Environment, verifying both the Kubernetes rollout and application health. Production checks enforce authorized approval and prevent unsafe concurrent releases, while test and security reports remain available in the pipeline.',
    ],
    code: [
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `trigger:
  batch: true
  branches:
    include:
      - main

pr:
  branches:
    include:
      - main

variables:
  imageRepository: orders-api
  imageTag: $(Build.SourceVersion)
  registryServer: <acr-name>.azurecr.io
  developmentResourceGroup: <development-resource-group>
  developmentAksName: <development-aks-name>
  productionResourceGroup: <production-resource-group>
  productionAksName: <production-aks-name>
  developmentHealthUrl: https://orders-api-dev.example.com/actuator/health
  productionHealthUrl: https://orders.example.com/actuator/health

stages:
  - stage: Quality
    displayName: Build, test, and analyze
    jobs:
      - job: QualityChecks
        pool:
          vmImage: ubuntu-latest
        steps:
          - checkout: self
            fetchDepth: 0

          - task: SonarQubePrepare@7
            displayName: Prepare SonarQube analysis
            inputs:
              SonarQube: <sonarqube-service-connection>
              scannerMode: other
              extraProperties: |
                sonar.projectKey=orders-api
                sonar.projectName=orders-api
                sonar.qualitygate.wait=true
                sonar.qualitygate.timeout=600

          - task: Maven@4
            displayName: Build, unit test, and run SonarQube analysis
            inputs:
              mavenPomFile: pom.xml
              goals: clean verify
              options: -B
              publishJUnitResults: false
              sonarQubeRunAnalysis: true

          - task: SonarQubePublish@7
            displayName: Publish Quality Gate
            inputs:
              pollingTimeoutSec: "600"

          - script: |
              mvn -B org.owasp:dependency-check-maven:check \\
                -DfailBuildOnCVSS=7 \\
                -Dformat=HTML
            displayName: Scan dependencies

          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFormat: JUnit
              testResultsFiles: target/surefire-reports/*.xml
              failTaskOnFailedTests: true

          - task: PublishPipelineArtifact@1
            condition: always()
            continueOnError: true
            inputs:
              targetPath: target/dependency-check-report.html
              artifact: dependency-check-report

  - stage: Build
    displayName: Build, scan, and push image
    dependsOn: Quality
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: BuildImage
        pool:
          vmImage: ubuntu-latest
        steps:
          - checkout: self

          - task: Docker@2
            displayName: Build image
            inputs:
              containerRegistry: <acr-service-connection>
              repository: $(imageRepository)
              command: build
              Dockerfile: Dockerfile
              tags: $(imageTag)

          - script: |
              docker run --rm \\
                -v /var/run/docker.sock:/var/run/docker.sock \\
                "aquasec/trivy:<approved-version>" image \\
                --exit-code 1 \\
                --severity HIGH,CRITICAL \\
                $(registryServer)/$(imageRepository):$(imageTag)
            displayName: Scan image

          - task: Docker@2
            displayName: Push image
            inputs:
              containerRegistry: <acr-service-connection>
              repository: $(imageRepository)
              command: push
              tags: $(imageTag)

  - stage: Development
    dependsOn: Build
    jobs:
      - deployment: DeployDevelopment
        environment: development
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureCLI@2
                  displayName: Deploy and verify Development
                  inputs:
                    azureSubscription: <development-service-connection>
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      az aks get-credentials \\
                        --resource-group "$(developmentResourceGroup)" \\
                        --name "$(developmentAksName)" \\
                        --overwrite-existing

                      helm upgrade --install orders-api ./helm/orders-api \\
                        --namespace development \\
                        --create-namespace \\
                        --set image.repository=$(registryServer)/$(imageRepository) \\
                        --set image.tag=$(imageTag) \\
                        --wait

                      kubectl rollout status deployment/orders-api \\
                        --namespace development

                      curl --fail --show-error --silent \\
                        --retry 10 --retry-delay 5 --retry-connrefused \\
                        $(developmentHealthUrl)

  - stage: Production
    dependsOn: Development
    condition: succeeded()
    jobs:
      - deployment: DeployProduction
        environment: production
        pool:
          vmImage: ubuntu-latest
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureCLI@2
                  displayName: Deploy and verify Production
                  inputs:
                    azureSubscription: <production-service-connection>
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      az aks get-credentials \\
                        --resource-group "$(productionResourceGroup)" \\
                        --name "$(productionAksName)" \\
                        --overwrite-existing

                      helm upgrade --install orders-api ./helm/orders-api \\
                        --namespace production \\
                        --create-namespace \\
                        --set image.repository=$(registryServer)/$(imageRepository) \\
                        --set image.tag=$(imageTag) \\
                        --wait

                      kubectl rollout status deployment/orders-api \\
                        --namespace production

                      curl --fail --show-error --silent \\
                        --retry 10 --retry-delay 5 --retry-connrefused \\
                        $(productionHealthUrl)`,
      },
      {
        title: 'Pipeline flow',
        language: 'text',
        code: `Build and unit test
-> SonarQube analysis and blocking Quality Gate
-> Dependency vulnerability scan
-> Build and scan the image
-> Push the image to ACR
-> Deploy and smoke-test Development
-> Protected Production Environment approval
-> Deploy and smoke-test the same image in Production
-> Publish reports and notify the team`,
      },
    ],
    traps: [
      'For Azure Repos Git, the YAML `pr:` trigger is ignored - pull-request validation is configured with a build validation branch policy. The `pr:` block works for GitHub and Bitbucket repositories.',
    ],
    followUps: [
      'Why is the approval configured on the environment rather than in the YAML?',
      'What does the exclusive-lock check protect against?',
    ],
    tags: ['azure devops', 'ci/cd', 'sonarqube'],
  },
  {
    id: 'itv-myfaq-52',
    level: 'advanced',
    kind: 'open',
    prompt: 'Write a production-grade GitHub Actions workflow with quality gates and explain it.',
    probing:
      'Least-privilege permissions, OIDC login, environments with reviewers, concurrency, and fork safety.',
    answer: [
      '**Explanation of each part:**',
      "- Pull requests run the quality and security checks, while a push to `main` also publishes and deploys the image.\n- `fetch-depth: 0` supplies the Git history needed by SonarQube.\n- `sonar.qualitygate.wait=true` makes a failed Quality Gate fail the job instead of merely displaying a result.\n- OWASP Dependency-Check gates high-risk dependencies, and the reports are retained as a workflow artifact.\n- Trivy scans the locally built image before Azure authentication and before the push to ACR.\n- `needs` defines the job order.\n- Job-scoped `id-token: write` lets only deployment-related jobs obtain short-lived Azure access through OpenID Connect.\n- Required reviewers and protected secrets are configured on the GitHub `production` Environment.\n- `concurrency: production` prevents overlapping Production deployments.\n- Both environments verify the Kubernetes rollout and application health for the same commit-SHA image.\n- GitHub's built-in Actions notifications can be supplemented with an organization-approved Teams, Slack, or email integration.",
      "Forked pull requests do not receive repository secrets, so organizations should use SonarQube's recommended fork policy and never expose credentials to untrusted code. Pin actions and the Trivy container to reviewed immutable versions or digests rather than leaving version placeholders in a real workflow.",
      '**One-minute interview answer:** This GitHub Actions workflow builds and tests the Maven application, sends the results to SonarQube, and waits for the Quality Gate. It also blocks high-risk dependency findings. A successful push to `main` builds a commit-tagged Docker image, scans it with Trivy, authenticates to Azure through OpenID Connect, and pushes it to ACR. The workflow deploys the same image to Development, verifies the rollout and health endpoint, and then pauses at the protected Production Environment for a required review. After approval it performs the same checks in Production, while concurrency prevents overlapping Production deployments.',
    ],
    code: [
      {
        title: '.github/workflows/delivery.yml',
        language: 'yaml',
        code: `name: delivery

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

permissions:
  contents: read

env:
  ACR_NAME: <acr-name>
  REGISTRY: <acr-name>.azurecr.io
  IMAGE_NAME: orders-api
  DEVELOPMENT_RESOURCE_GROUP: <development-resource-group>
  DEVELOPMENT_AKS_NAME: <development-aks-name>
  PRODUCTION_RESOURCE_GROUP: <production-resource-group>
  PRODUCTION_AKS_NAME: <production-aks-name>
  DEVELOPMENT_HEALTH_URL: https://orders-api-dev.example.com/actuator/health
  PRODUCTION_HEALTH_URL: https://orders.example.com/actuator/health

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven

      - name: Build, unit test, analyze, and wait for Quality Gate
        env:
          SONAR_HOST_URL: \${{ secrets.SONAR_HOST_URL }}
          SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
        run: |
          mvn -B clean verify sonar:sonar \\
            -Dsonar.projectKey=orders-api \\
            -Dsonar.host.url="$SONAR_HOST_URL" \\
            -Dsonar.token="$SONAR_TOKEN" \\
            -Dsonar.qualitygate.wait=true \\
            -Dsonar.qualitygate.timeout=600

      - name: Scan dependencies
        run: |
          mvn -B org.owasp:dependency-check-maven:check \\
            -DfailBuildOnCVSS=7 \\
            -Dformat=HTML

      - name: Publish unit-test and dependency reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: quality-reports
          path: |
            target/surefire-reports/*.xml
            target/dependency-check-report.html
          if-no-files-found: ignore

  build:
    if: github.event_name == 'push'
    needs: quality
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t $REGISTRY/$IMAGE_NAME:\${{ github.sha }} .

      - name: Scan image
        run: |
          docker run --rm \\
            -v /var/run/docker.sock:/var/run/docker.sock \\
            "aquasec/trivy:<approved-version>" image \\
            --exit-code 1 \\
            --severity HIGH,CRITICAL \\
            $REGISTRY/$IMAGE_NAME:\${{ github.sha }}

      - uses: azure/login@v2
        with:
          client-id: \${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: \${{ secrets.AZURE_TENANT_ID }}
          subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Push image to ACR
        run: |
          az acr login --name "$ACR_NAME"
          docker push $REGISTRY/$IMAGE_NAME:\${{ github.sha }}

  development:
    needs: build
    runs-on: ubuntu-latest
    environment: development
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: \${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: \${{ secrets.AZURE_TENANT_ID }}
          subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: |
          az aks get-credentials \\
            --resource-group "$DEVELOPMENT_RESOURCE_GROUP" \\
            --name "$DEVELOPMENT_AKS_NAME" \\
            --overwrite-existing

          helm upgrade --install orders-api ./helm/orders-api \\
            --namespace development \\
            --create-namespace \\
            --set image.repository=$REGISTRY/$IMAGE_NAME \\
            --set image.tag=\${{ github.sha }} \\
            --wait

          kubectl rollout status deployment/orders-api \\
            --namespace development

          curl --fail --show-error --silent \\
            --retry 10 --retry-delay 5 --retry-connrefused \\
            "$DEVELOPMENT_HEALTH_URL"

  production:
    needs: development
    runs-on: ubuntu-latest
    environment: production
    concurrency: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: azure/login@v2
        with:
          client-id: \${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: \${{ secrets.AZURE_TENANT_ID }}
          subscription-id: \${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: |
          az aks get-credentials \\
            --resource-group "$PRODUCTION_RESOURCE_GROUP" \\
            --name "$PRODUCTION_AKS_NAME" \\
            --overwrite-existing

          helm upgrade --install orders-api ./helm/orders-api \\
            --namespace production \\
            --create-namespace \\
            --set image.repository=$REGISTRY/$IMAGE_NAME \\
            --set image.tag=\${{ github.sha }} \\
            --wait

          kubectl rollout status deployment/orders-api \\
            --namespace production

          curl --fail --show-error --silent \\
            --retry 10 --retry-delay 5 --retry-connrefused \\
            "$PRODUCTION_HEALTH_URL"`,
      },
      {
        title: 'Pipeline flow',
        language: 'text',
        code: `Build and unit test
-> SonarQube analysis and blocking Quality Gate
-> Dependency vulnerability scan
-> Build and scan the image
-> Push the image to ACR
-> Deploy and smoke-test Development
-> Required Production Environment review
-> Deploy and smoke-test the same image in Production
-> Retain reports and notify the team`,
      },
    ],
    followUps: [
      'What does the federated credential in Entra ID need to match for this OIDC login to work?',
      'Why grant `id-token: write` per job instead of at the workflow level?',
    ],
    tags: ['github actions', 'ci/cd', 'oidc'],
  },
  {
    id: 'itv-myfaq-53',
    level: 'advanced',
    kind: 'open',
    prompt: 'Write a production-grade GitLab CI/CD pipeline with quality gates and explain it.',
    probing:
      'GitLab specifics: workflow rules, needs graph, reports, manual protected environments and resource_group.',
    answer: [
      '**Explanation of each part:**',
      '- `workflow.rules` creates pipelines for merge requests and the default branch without creating redundant feature-branch pipelines.\n- `GIT_DEPTH: "0"` provides complete Git history to SonarQube.\n- `sonar.qualitygate.wait=true` makes the SonarQube job block the pipeline when the Quality Gate fails.\n- OWASP Dependency-Check fails on dependency findings with a CVSS score of 7 or higher and retains the HTML report.\n- The image is built once, scanned with Trivy, and pushed only from the default branch after all gates pass.\n- `needs` defines the dependency graph and prevents later jobs from running after a failed quality or security check.\n- Test, coverage, and security reports remain available even when their jobs fail.\n- Development and Production deployments verify both the Kubernetes rollout and the application health endpoint.\n- `when: manual` creates the Production approval action.\n- A protected Production Environment limits who can approve and deploy.\n- `resource_group` prevents two Production deployments from running at the same time.\n- The same commit-tagged image goes to Development and Production.',
      'The runner should use a protected short-lived Azure identity. Store `SONAR_TOKEN` and `SONAR_HOST_URL` as masked CI/CD variables, and never expose Production variables or runners to untrusted merge-request code. GitLab integrations can send pipeline results to email, Teams, or Slack without hardcoding webhook secrets in the file.',
      '**One-minute interview answer:** This GitLab pipeline runs for merge requests and the default branch. It builds and tests the Maven project, performs SonarQube analysis, waits for the Quality Gate, and scans dependencies with OWASP Dependency-Check. On the default branch, it builds one commit-tagged container, blocks high and critical Trivy findings, and pushes the image to ACR. GitLab then deploys the same image to Development and verifies both rollout and health. Production is a protected manual job, and its resource group prevents concurrent releases. Test, coverage, and security reports are retained for troubleshooting and audit.',
    ],
    code: [
      {
        title: '.gitlab-ci.yml',
        language: 'yaml',
        code: `workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

stages:
  - quality
  - security
  - build
  - development
  - production

variables:
  ACR_NAME: <acr-name>
  REGISTRY: <acr-name>.azurecr.io
  IMAGE_NAME: orders-api
  IMAGE_TAG: $CI_COMMIT_SHA
  GIT_DEPTH: "0"
  MAVEN_OPTS: -Dmaven.repo.local=$CI_PROJECT_DIR/.m2/repository
  SONAR_USER_HOME: $CI_PROJECT_DIR/.sonar
  DEVELOPMENT_RESOURCE_GROUP: <development-resource-group>
  DEVELOPMENT_AKS_NAME: <development-aks-name>
  PRODUCTION_RESOURCE_GROUP: <production-resource-group>
  PRODUCTION_AKS_NAME: <production-aks-name>
  DEVELOPMENT_HEALTH_URL: https://orders-api-dev.example.com/actuator/health
  PRODUCTION_HEALTH_URL: https://orders.example.com/actuator/health

quality:
  stage: quality
  cache:
    key: maven-sonar
    paths:
      - .m2/repository
      - .sonar/cache
  script:
    - >
      mvn -B clean verify sonar:sonar
      -Dsonar.projectKey=orders-api
      -Dsonar.qualitygate.wait=true
      -Dsonar.qualitygate.timeout=600
  artifacts:
    when: always
    paths:
      - target/site/jacoco/
    reports:
      junit:
        - target/surefire-reports/*.xml

dependency_scan:
  stage: security
  needs:
    - quality
  script:
    - >
      mvn -B org.owasp:dependency-check-maven:check
      -DfailBuildOnCVSS=7
      -Dformat=HTML
  artifacts:
    when: always
    paths:
      - target/dependency-check-report.html

build_scan_push:
  stage: build
  needs:
    - quality
    - dependency_scan
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  script:
    - docker build -t "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG" .
    - >
      docker run --rm
      -v /var/run/docker.sock:/var/run/docker.sock
      "aquasec/trivy:<approved-version>" image
      --exit-code 1
      --severity HIGH,CRITICAL
      "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
    - az acr login --name "$ACR_NAME"
    - docker push "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"

deploy_development:
  stage: development
  needs:
    - build_scan_push
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  environment:
    name: development
  script:
    - >
      az aks get-credentials
      --resource-group "$DEVELOPMENT_RESOURCE_GROUP"
      --name "$DEVELOPMENT_AKS_NAME"
      --overwrite-existing
    - >
      helm upgrade --install orders-api ./helm/orders-api
      --namespace development
      --create-namespace
      --set image.repository="$REGISTRY/$IMAGE_NAME"
      --set image.tag="$IMAGE_TAG"
      --wait
    - kubectl rollout status deployment/orders-api --namespace development
    - >
      curl --fail --show-error --silent
      --retry 10 --retry-delay 5 --retry-connrefused
      "$DEVELOPMENT_HEALTH_URL"

deploy_production:
  stage: production
  needs:
    - deploy_development
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  environment:
    name: production
  resource_group: production
  when: manual
  allow_failure: false
  script:
    - >
      az aks get-credentials
      --resource-group "$PRODUCTION_RESOURCE_GROUP"
      --name "$PRODUCTION_AKS_NAME"
      --overwrite-existing
    - >
      helm upgrade --install orders-api ./helm/orders-api
      --namespace production
      --create-namespace
      --set image.repository="$REGISTRY/$IMAGE_NAME"
      --set image.tag="$IMAGE_TAG"
      --wait
    - kubectl rollout status deployment/orders-api --namespace production
    - >
      curl --fail --show-error --silent
      --retry 10 --retry-delay 5 --retry-connrefused
      "$PRODUCTION_HEALTH_URL"`,
      },
      {
        title: 'Pipeline flow',
        language: 'text',
        code: `Build and unit test
-> SonarQube analysis and blocking Quality Gate
-> Dependency vulnerability scan
-> Build and scan the image
-> Push the image to ACR
-> Deploy and smoke-test Development
-> Protected manual Production approval
-> Deploy and smoke-test the same image in Production
-> Retain reports and notify the team`,
      },
    ],
    followUps: [
      'What is the difference between `needs` and `stages` ordering in GitLab?',
      'How do protected environments and protected branches work together here?',
    ],
    tags: ['gitlab', 'ci/cd', 'sonarqube'],
  },
]
