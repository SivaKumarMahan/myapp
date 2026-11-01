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
  {
    id: 'itv-myfaq-400',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the correct order of the DevOps lifecycle?',
    probing:
      'Knowing the DevOps loop, and mapping multiple-choice wording onto it so Deploy always comes before Operate.',
    answer: [
      'The DevOps loop is: Plan -> Code (commit to Git) -> Build -> Test -> Release -> Deploy -> Operate -> Monitor -> back to Plan.',
      'In a multiple-choice question, map each option to these words. "Commit code to source control" is Code, "Build the package" is Build, "Bring the product into operation" is Operate. Deploy always comes before Operate.',
      'If the given options do not start with commit, pick the option that keeps Build -> Test -> Release -> Deploy -> Operate in order. In one real interview question, the accepted answer was: Build -> Test and integrate -> Commit -> Release -> Deploy to production -> Operate.',
      '**Same flow in AWS tools.** A related question asked for the correct AWS DevOps tool order: CodePipeline (orchestrates) -> CodeCommit (source) -> CodeBuild (build and test) -> CodeDeploy (deploy). The Azure equivalent is Azure Pipelines -> Azure Repos -> build job -> deployment job.',
      '**Things to remember:**',
      '- CloudWatch and X-Ray are monitoring and tracing tools. They are not steps in the build-and-deploy chain.\n- AWS stopped onboarding new CodeCommit customers in 2024, so new AWS projects usually keep the code in GitHub or GitLab and connect it to CodePipeline.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'The DevOps loop',
        caption: 'Deploy always comes before Operate, and Monitor feeds back into Plan.',
        nodes: [
          { label: 'Plan', tone: 'accent' },
          { label: 'Code', detail: 'Commit to Git' },
          { label: 'Build' },
          { label: 'Test' },
          { label: 'Release' },
          { label: 'Deploy', tone: 'success' },
          { label: 'Operate and Monitor', detail: 'Back to Plan' },
        ],
      },
    ],
    code: [
      {
        title: 'DevOps loop',
        language: 'text',
        code: `Plan -> Code (commit to Git) -> Build -> Test -> Release -> Deploy -> Operate -> Monitor -> back to Plan`,
      },
      {
        title: 'Accepted answer in one interview question',
        language: 'text',
        code: `Build -> Test and integrate -> Commit -> Release -> Deploy to production -> Operate`,
      },
      {
        title: 'Same flow in AWS tools',
        language: 'text',
        code: `CodePipeline (orchestrates) -> CodeCommit (source) -> CodeBuild (build and test) -> CodeDeploy (deploy)`,
      },
    ],
    tags: ['devops', 'lifecycle', 'aws'],
  },
  {
    id: 'itv-myfaq-401',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does a pipeline run automatically in Azure DevOps?',
    probing:
      'The four trigger types, the default behaviour with no trigger block, and that `pr:` is ignored for Azure Repos.',
    answer: [
      'Through triggers. There are four types:',
      '- **Push to a branch** -> CI trigger.\n- **Pull request** -> PR trigger or branch policy build validation.\n- **Time of day** -> Scheduled trigger.\n- **Another pipeline finishes** -> Pipeline completion (resource) trigger.',
      '**Things to remember:**',
      '- With no `trigger` block, a YAML pipeline runs on every push to every branch. `trigger: none` turns CI off.\n- The `pr:` block works for GitHub and Bitbucket. For **Azure Repos**, it is ignored. I add the pipeline under **Branch policies -> Build validation** on `main` instead.\n- If a pipeline does not trigger, I check: the YAML exists on that branch, the branch and path filters match, the pipeline is not disabled, and the trigger is not overridden in the UI settings.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'What starts the pipeline',
        caption: 'Each event maps to one trigger type.',
        question: 'What event should start the run?',
        branches: [
          { condition: 'Push to a branch', result: 'CI trigger' },
          {
            condition: 'Pull request',
            result: 'PR trigger or build validation',
            detail: 'Azure Repos uses branch policy build validation',
          },
          { condition: 'Time of day', result: 'Scheduled trigger', detail: 'cron is in UTC' },
          {
            condition: 'Another pipeline finishes',
            result: 'Pipeline completion trigger',
            tone: 'accent',
          },
        ],
      },
    ],
    code: [
      {
        title: 'CI, scheduled and pipeline completion triggers',
        language: 'yaml',
        code: `# CI trigger with a path filter
trigger:
  branches:
    include: [main]
  paths:
    exclude: [docs/*]

# Nightly run (cron is in UTC)
schedules:
  - cron: "30 2 * * *"        # 02:30 UTC = 08:00 IST
    displayName: Nightly scan
    branches:
      include: [main]
    always: true              # run even when nothing changed

# Start this CD pipeline when the CI pipeline finishes
resources:
  pipelines:
    - pipeline: ci
      source: payment-api-ci
      trigger:
        branches:
          include: [main]`,
      },
    ],
    tags: ['azure devops', 'triggers', 'yaml'],
  },
  {
    id: 'itv-myfaq-402',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is an Azure DevOps Service Connection?',
    probing:
      'That it keeps credentials out of YAML, uses workload identity federation, and is scoped per environment with least privilege.',
    answer: [
      'A service connection stores how a pipeline authenticates to an outside system. The YAML only uses its name, so no credentials are in the pipeline file.',
      'Common service connection types:',
      '- **Azure Resource Manager** - deploy to an Azure subscription or resource group.\n- **Docker Registry** - log in to ACR or Docker Hub.\n- **Kubernetes** - connect to a cluster.\n- **GitHub**, **SonarQube**, generic and others.',
      'For Azure, I create Azure Resource Manager connections with **workload identity federation**. The pipeline gets a short-lived token, so there is no client secret to store or rotate. I automated service connection setup with Bicep, so every new project got the same configuration.',
      '**Things to remember:**',
      '- One connection per environment. The Dev connection cannot touch Production.\n- Give its identity only the roles it needs, at the smallest scope (for example Contributor on one resource group, AcrPush on the registry).\n- Do not grant it to all pipelines. Use **pipeline permissions** and add **approvals and checks** on the Production connection.',
    ],
    code: [
      {
        title: 'Use a service connection by name',
        language: 'yaml',
        code: `- task: AzureCLI@2
  inputs:
    azureSubscription: 'prod-arm-wif'    # the service connection name
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: az group list -o table`,
      },
    ],
    followUps: [
      'How does workload identity federation avoid storing a client secret?',
      'How would you stop a Dev pipeline from using the Production connection?',
    ],
    tags: ['azure devops', 'service connection', 'security'],
  },
  {
    id: 'itv-myfaq-403',
    level: 'basic',
    kind: 'mcq',
    prompt: 'What is the purpose of GitLab Environments in CI/CD?',
    options: [
      {
        id: 'a',
        text: 'They represent where the application is deployed and track deployments, status and rollback',
      },
      { id: 'b', text: 'They control which runners can access which cloud regions' },
      { id: 'c', text: 'They store the source code for each stage of the pipeline' },
      { id: 'd', text: 'They define which Docker image each job runs in' },
    ],
    correct: ['a'],
    probing:
      'That an environment is a deployment target with history and protection, not a runner or region access control.',
    answer: [
      'An environment represents a place where the application is deployed, such as development, staging, or production. It is not about access control for runners or regions.',
      'The CI/CD tool uses it to:',
      '- Track which version is deployed where, and the deployment history.\n- Show the environment status and a link to the deployed app.\n- Protect important environments with approvals.\n- Roll back to an earlier deployment.',
      'The same idea exists in other tools: GitLab uses `environment:` plus protected environments (required approvals), Azure DevOps uses a deployment job with `environment:` plus approvals and checks, and GitHub Actions uses `environment:` plus required reviewers.',
    ],
    code: [
      {
        title: 'GitLab environment',
        language: 'yaml',
        code: `# GitLab
deploy_production:
  stage: deploy
  script: ./deploy.sh production
  environment:
    name: production
    url: https://orders.example.com
  when: manual`,
      },
      {
        title: 'Same idea in other tools',
        language: 'text',
        code: `GitLab         -> environment: + protected environments (required approvals)
Azure DevOps   -> deployment job with environment: + approvals and checks
GitHub Actions -> environment: + required reviewers`,
      },
    ],
    tags: ['gitlab', 'azure devops', 'environments'],
  },
  {
    id: 'itv-myfaq-404',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you avoid duplicating YAML across Azure DevOps pipelines?',
    probing:
      'Templates with parameters, the template levels, a central versioned template repo, and extends templates with the Required template check.',
    answer: [
      'Dev, QA, and Prod have the same deployment steps, so I use **templates with parameters**. The logic is written once and each environment passes its own values.',
      'There are four template levels:',
      '- **Step template** - a few repeated steps.\n- **Job template** - a whole job.\n- **Stage template** - a whole environment deployment.\n- **Variable template** - shared variables.',
      'For many repositories, I keep the templates in one central repo and reference them.',
    ],
    deeper: [
      'Pin the template repo to a tag so a template change does not break every pipeline at once.',
      '`extends` templates plus the **Required template** check on an environment force every Production deployment to use the approved template (with its security scans).',
    ],
    code: [
      {
        title: 'Repository layout',
        language: 'text',
        code: `azure-pipelines.yml
templates/
  build.yml
  security-scan.yml
  helm-deploy.yml`,
      },
      {
        title: 'templates/helm-deploy.yml',
        language: 'yaml',
        code: `parameters:
  - name: environment
    type: string
  - name: serviceConnection
    type: string
  - name: aksName
    type: string

stages:
  - stage: Deploy_\${{ parameters.environment }}
    jobs:
      - deployment: Deploy
        environment: \${{ parameters.environment }}
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: \${{ parameters.serviceConnection }}
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      az aks get-credentials -g rg-\${{ parameters.environment }} -n \${{ parameters.aksName }} --overwrite-existing
                      helm upgrade --install payment-api ./helm/payment-api --set image.tag=$(Build.BuildId) --wait`,
      },
      {
        title: 'azure-pipelines.yml',
        language: 'yaml',
        code: `stages:
  - template: templates/helm-deploy.yml
    parameters: { environment: dev,  serviceConnection: dev-arm-wif,  aksName: aks-dev }
  - template: templates/helm-deploy.yml
    parameters: { environment: prod, serviceConnection: prod-arm-wif, aksName: aks-prod }`,
      },
      {
        title: 'Templates from a central repo',
        language: 'yaml',
        code: `resources:
  repositories:
    - repository: templates
      type: git
      name: Platform/pipeline-templates
      ref: refs/tags/v1.4.0      # pin a version

stages:
  - template: stages/helm-deploy.yml@templates
    parameters: { environment: dev, serviceConnection: dev-arm-wif, aksName: aks-dev }`,
      },
    ],
    followUps: [
      'What is the difference between an `include`-style template and an `extends` template?',
      'Why is `${{ parameters.environment }}` resolved at compile time and not at runtime?',
    ],
    tags: ['azure devops', 'templates', 'yaml'],
  },
  {
    id: 'itv-myfaq-405',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How many YAML pipelines do you have per environment?',
    probing:
      'One multi-stage pipeline per application with a stage per environment, not a copied pipeline per environment.',
    answer: [
      'I do not create one pipeline for each environment. Usually I have **one multi-stage YAML pipeline per application**. Each environment is a stage.',
      'Each stage gets its own settings:',
      '- **Dev** -> dev variable group + dev service connection + `aks-dev`.\n- **QA** -> qa variable group + qa service connection + `aks-qa`.\n- **Prod** -> prod variable group + prod service connection + `aks-prod` + approval.',
      'The deploy logic is a shared stage template, so adding an environment is a few lines, not a copied file.',
      '**Things to remember:**',
      '- Some teams split CI and CD into two pipelines connected by a pipeline completion trigger. That is fine. Still, it is not one pipeline per environment.\n- Terraform often has its own pipeline, separate from the application pipeline.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'One multi-stage pipeline',
        caption: 'Each environment is a stage, not a separate pipeline.',
        nodes: [
          { label: 'Build and test', detail: 'SonarQube, Trivy', tone: 'accent' },
          { label: 'Push to ACR' },
          { label: 'Deploy Dev' },
          { label: 'Deploy QA and UAT' },
          { label: 'Approval', tone: 'warning' },
          { label: 'Deploy Prod', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Stages in one pipeline',
        language: 'text',
        code: `azure-pipelines.yml
  Build -> Test -> SonarQube -> Docker build -> Trivy -> Push to ACR
  -> Deploy Dev -> Deploy QA -> Deploy UAT -> Approval -> Deploy Prod`,
      },
    ],
    tags: ['azure devops', 'multi-stage', 'environments'],
  },
  {
    id: 'itv-myfaq-406',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use multiple agents in a YAML pipeline?',
    probing:
      'That one job runs on one agent, so parallelism comes from more jobs, and jobs pass files only through artifacts.',
    answer: [
      '**One job runs on one agent.** To use more agents, I split the work into more jobs. Jobs without `dependsOn` between them run in parallel, if the organization has enough parallel jobs.',
      '**Things to remember:**',
      '- Each job can pick its own pool: Microsoft-hosted, self-hosted, or a scale set pool. Use `demands` to choose agents with specific tools.\n- Jobs do not share files. Pass outputs with pipeline artifacts.\n- `strategy: matrix` or `parallel` creates many copies of one job, for example to test on several Node or Java versions.\n- `pool: server` is an agentless job, used for `ManualValidation@1` and similar tasks.',
    ],
    code: [
      {
        title: 'Jobs on different agents',
        language: 'yaml',
        code: `jobs:
  - job: Backend
    pool:
      vmImage: ubuntu-latest
    steps:
      - script: ./mvnw clean package

  - job: Frontend
    pool:
      vmImage: ubuntu-latest
    steps:
      - script: npm ci && npm run build

  - job: WindowsBuild
    pool:
      name: windows-self-hosted        # a self-hosted pool
    steps:
      - powershell: .\\build.ps1

  - job: Package
    dependsOn: [Backend, Frontend]     # waits for both, may run on another agent
    pool:
      vmImage: ubuntu-latest
    steps:
      - script: echo "package"`,
      },
      {
        title: 'Which agent runs what',
        language: 'text',
        code: `Agent 1: Backend   \\
                     -> Agent 3: Package
Agent 2: Frontend  /
Agent 4: WindowsBuild (self-hosted pool)`,
      },
    ],
    tags: ['azure devops', 'agents', 'yaml'],
  },
  {
    id: 'itv-myfaq-407',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you add manual validation to an Azure DevOps pipeline?',
    probing:
      'Both mechanisms - the ManualValidation task in an agentless job and environment approvals - and why Production uses the environment.',
    answer: [
      'Yes, I have added manual approvals to pipelines. There are two ways.',
      '**1. `ManualValidation@1` task** - pauses in the middle of a run, for example after a Terraform plan. It must be in an agentless job.',
      '**2. Environment approvals and checks** - preferred for Production. In **Pipelines -> Environments -> prod -> Approvals and checks**, I add Approvals, Branch control (only `main`), Business hours, or Exclusive lock. Any deployment job with `environment: prod` waits for them.',
      'The ManualValidation task lives in YAML, so a developer can delete it. An environment approval lives on the environment, so it cannot be removed by editing YAML.',
    ],
    deeper: [
      'I use the task to review output in the middle of a run, and environment approvals to gate every Production deployment.',
      'The Jenkins equivalent is `input`. The GitHub equivalent is an environment with required reviewers.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which manual gate to use',
        caption: 'Production is gated on the environment, where YAML edits cannot remove it.',
        question: 'What do you need to approve?',
        branches: [
          {
            condition: 'Output in the middle of a run',
            result: 'ManualValidation task',
            detail: 'Agentless job, for example after a plan',
          },
          {
            condition: 'Every Production deployment',
            result: 'Environment approvals and checks',
            detail: 'Cannot be removed by editing YAML',
            tone: 'success',
          },
        ],
      },
    ],
    code: [
      {
        title: 'ManualValidation in an agentless job',
        language: 'yaml',
        code: `- job: ReviewPlan
  dependsOn: TerraformPlan
  pool: server
  timeoutInMinutes: 1440               # longer than the task timeout
  steps:
    - task: ManualValidation@1
      timeoutInMinutes: 1380
      inputs:
        approvers: 'platform-team@company.com'
        notifyUsers: 'platform-team@company.com'
        instructions: 'Review the Terraform plan before apply.'
        allowApproversToApproveTheirOwnRuns: false
        onTimeout: 'reject'`,
      },
      {
        title: 'Task versus environment approval',
        language: 'text',
        code: `ManualValidation task  -> lives in YAML, a developer can delete it
Environment approval   -> lives on the environment, cannot be removed by editing YAML`,
      },
    ],
    followUps: [
      'Why must the job timeout be longer than the ManualValidation task timeout?',
      'What does the Exclusive lock check protect against?',
    ],
    tags: ['azure devops', 'approvals', 'environments'],
  },
  {
    id: 'itv-myfaq-408',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Stage and Production are in different resource groups and share one ACR. How do you promote the same image from Stage to Production?',
    probing:
      'Build once, deploy by digest, AcrPull for both clusters, and no environment-specific values baked into the image.',
    answer: [
      'I build and push the image **once**, then deploy that same reference to Stage and later to Production. I never rebuild for Production.',
      "Both clusters need pull access. Resource groups do not matter. `--attach-acr` gives the cluster's kubelet identity the **AcrPull** role.",
    ],
    deeper: [
      'A digest is fixed. A tag can be overwritten. I can lock a released image with `az acr repository update --image payment-api:1.4.2 --write-enabled false`.',
      'If ACR has a private endpoint, both cluster VNets must reach it and resolve `privatelink.azurecr.io`.',
      'Environment differences go in Helm values, ConfigMaps, or Key Vault, never in the image.',
      'With two registries (for example a separate Production ACR), I copy the tested image with `az acr import` instead of rebuilding.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Promote one image Stage to Prod',
        caption: 'The digest tested in Stage is the digest deployed to Production.',
        nodes: [
          { label: 'Build, scan, push once', detail: 'payment-api:1.4.2', tone: 'accent' },
          { label: 'Deploy Stage', detail: 'rg-stage' },
          {
            label: 'Smoke tests',
            branch: { label: 'Tests fail', detail: 'Stop, do not promote', tone: 'danger' },
          },
          { label: 'Approval', tone: 'warning' },
          { label: 'Deploy Prod', detail: 'rg-prod, same digest', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Promotion flow',
        language: 'text',
        code: `CI: build -> scan -> push myacr.azurecr.io/payment-api:1.4.2 (digest sha256:abc...)
-> Deploy Stage (rg-stage) -> smoke tests
-> Approval
-> Deploy Prod (rg-prod) with the same tag, or better, the same digest`,
      },
      {
        title: 'Deploy by digest',
        language: 'yaml',
        code: `image: myacr.azurecr.io/payment-api@sha256:<digest-tested-in-stage>`,
      },
      {
        title: 'Give both clusters pull access',
        language: 'bash',
        code: `az aks update -g rg-stage -n aks-stage --attach-acr myacr
az aks update -g rg-prod  -n aks-prod  --attach-acr myacr`,
      },
    ],
    followUps: [
      'How do you find the digest of the image that was tested in Stage?',
      'How would you copy the image to a separate Production registry?',
    ],
    tags: ['acr', 'promotion', 'aks'],
  },
  {
    id: 'itv-myfaq-409',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What code checks do you run in CI/CD, like SonarQube and Trivy?',
    probing:
      'Layered checks that each stop the pipeline, and knowing what each tool does and does not cover.',
    answer: [
      'I add checks at several levels. Each one can stop the pipeline.',
      '- **Build** (Maven, npm): stops when code does not compile.\n- **Unit tests** (JUnit, Jest): stops when a test fails.\n- **Code quality** (SonarQube Quality Gate): stops on bugs, low coverage, duplications, new vulnerabilities.\n- **Dependencies** (OWASP Dependency-Check, Trivy, Snyk, `npm audit`): stops when a known vulnerable library is used.\n- **Secrets** (Gitleaks): stops when a password or key is committed.\n- **Dockerfile** (Hadolint): stops on bad Dockerfile practices.\n- **Container image** (Trivy): stops on HIGH or CRITICAL CVEs.\n- **IaC** (`terraform validate`, TFLint, Checkov, Trivy config): stops on insecure or invalid infrastructure.\n- **Kubernetes manifests** (kubeconform, `helm lint`): stops on invalid manifests.\n- **After deploy** (`kubectl rollout status`, `curl` health check): stops when the app is not healthy.',
      'If Trivy finds a CRITICAL issue, the exit code is non-zero, so the job fails. The image is not pushed and not deployed. We update the base image or library, rebuild, and scan again.',
      '**Things to remember:**',
      '- SonarQube is mainly a code quality tool. It finds some security issues, but it is not a container or dependency scanner.\n- In my project, adding SonarQube, Trivy, and Checkov gates stopped vulnerable code, images, and IaC from reaching Production.',
    ],
    code: [
      {
        title: 'Fail the job on HIGH or CRITICAL findings',
        language: 'bash',
        code: `trivy image --severity HIGH,CRITICAL --exit-code 1 myacr.azurecr.io/payment-api:1.4.2`,
      },
    ],
    traps: [
      'Calling SonarQube a container or dependency scanner - it is mainly a code quality tool.',
    ],
    tags: ['devsecops', 'sonarqube', 'trivy'],
  },
  {
    id: 'itv-myfaq-410',
    level: 'advanced',
    kind: 'open',
    prompt: 'How have you used Azure App Service and Azure Functions in CI/CD?',
    probing:
      'Clear terms (App Service, Web App, Function App), the same build-once flow, slot deployment and swap, and Key Vault references.',
    answer: [
      '- **App Service** is the managed hosting platform.\n- **Web App** is an App Service app that hosts a website or API.\n- **Function App** runs event-driven code (HTTP, timer, Blob, Service Bus triggers). It can run on an App Service plan or a serverless plan such as Flex Consumption.',
      'The flow is the same as for AKS, only the target changes.',
      'I built Azure Functions triggered by Service Bus messages that generated documents into a Storage account. The pipeline deployed the function code. The Service Bus trigger then started each run.',
    ],
    deeper: [
      'Deploy to a **staging slot**, warm it up and test it, then **swap**. Rollback is swapping back.',
      "App settings are per environment. Secrets use Key Vault references (`@Microsoft.KeyVault(SecretUri=...)`) and the app's managed identity.",
      'I verify the release with the health endpoint, Application Insights, and Azure Monitor alerts.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'App Service release with a slot',
        caption: 'Package once, deploy to the staging slot, then swap.',
        nodes: [
          { label: 'Build and test', detail: 'Unit tests, SonarQube', tone: 'accent' },
          { label: 'Package once', detail: 'zip or jar artifact' },
          { label: 'Deploy Dev and QA' },
          { label: 'Approval', tone: 'warning' },
          { label: 'Deploy to staging slot', detail: 'Warm up and test' },
          {
            label: 'Swap to production',
            tone: 'success',
            branch: { label: 'Problem found', detail: 'Swap back', tone: 'danger' },
          },
        ],
      },
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Push -> build -> unit tests -> SonarQube -> package once (zip or jar) -> publish artifact
-> Deploy Dev -> Deploy QA -> Approval -> Deploy Prod (staging slot -> swap)`,
      },
      {
        title: 'Deploy to a slot, swap, and deploy a Function App',
        language: 'yaml',
        code: `- task: AzureWebApp@1
  inputs:
    azureSubscription: prod-arm-wif
    appType: webAppLinux
    appName: payment-web-prod
    deployToSlotOrASE: true
    resourceGroupName: rg-prod
    slotName: staging
    package: $(Pipeline.Workspace)/drop/app.jar

- task: AzureAppServiceManage@0
  inputs:
    azureSubscription: prod-arm-wif
    Action: Swap Slots
    WebAppName: payment-web-prod
    ResourceGroupName: rg-prod
    SourceSlot: staging

- task: AzureFunctionApp@2
  inputs:
    connectedServiceNameARM: prod-arm-wif
    appType: functionAppLinux
    appName: doc-generator-func-prod
    package: $(Pipeline.Workspace)/drop/function.zip`,
      },
    ],
    followUps: [
      'Which settings should be slot-sticky, and why?',
      'How does a Function App read a Key Vault secret without storing it?',
    ],
    tags: ['app service', 'azure functions', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-411',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A unit test fails in the pipeline. How do you help the developer?',
    probing:
      'Finding out whose problem it is first, giving the developer evidence, and owning the environment or pipeline part.',
    answer: [
      'I do not just send the failure back and say "please fix it." I find out **whose problem it is** first, give the developer clear evidence, and own the part that belongs to DevOps.',
      '- **Code bug** - fails locally and in CI with the same assertion. Developer fixes it.\n- **Test bug or test data** - wrong expected value, test depends on order or current date. Developer fixes it, I point to the cause.\n- **Flaky test** - passes on re-run with no code change. Developer marks or fixes it; I track flaky tests.\n- **Environment** - different JDK or Node version, missing env variable, time zone, no network to a dependency. DevOps fixes it.\n- **Pipeline** - wrong working directory, stale cache, wrong agent image, test DB not started. DevOps fixes it.',
      'What I give the developer:',
      '- The failing test name, the error, and the stack trace, plus the commit and pipeline run link.\n- The exact command and tool versions the pipeline used, so they can reproduce it (for example `mvn -B test -Dtest=PaymentServiceTest`).\n- What changed recently: their commit, a dependency update, or an agent image change.',
      '**Things to remember:**',
      '- Publish test results (`PublishTestResults@2` in Azure DevOps, `junit` in Jenkins, test reports in GitLab and GitHub). The **Tests** tab shows the failing test and its history, so nobody has to dig through logs.\n- Never skip tests (`-DskipTests`) to get a release out. Fix the test or quarantine a known flaky one with a ticket.\n- Pin tool versions in the agent image, so "works on my machine" does not happen because of a different JDK.',
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Whose problem is the failing test',
        caption: 'Reproduce on the same commit before assigning the fix.',
        question: 'Does it also fail locally on the same commit?',
        branches: [
          {
            condition: 'Yes',
            result: 'Code or test logic',
            detail: 'Developer fixes, I share the evidence',
          },
          {
            condition: 'No',
            result: 'Environment or pipeline',
            detail: 'I fix it, then re-run the full suite',
            tone: 'accent',
          },
        ],
      },
    ],
    code: [
      {
        title: 'Triage flow',
        language: 'text',
        code: `Unit test fails in CI
-> read the test report and stack trace
-> does it also fail locally, on the same commit?
   yes -> code or test logic -> developer fixes, I share the evidence
   no  -> environment or pipeline -> I fix it
-> re-run the full test suite
-> pipeline continues only when all tests pass`,
      },
      {
        title: 'Reproduce one test',
        language: 'bash',
        code: `mvn -B test -Dtest=PaymentServiceTest`,
      },
    ],
    traps: [
      'Skipping tests with `-DskipTests` to get a release out.',
      'Sending the failure back with "please fix it" and no evidence.',
    ],
    tags: ['unit tests', 'troubleshooting', 'ci/cd'],
  },
  {
    id: 'itv-myfaq-412',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'A Jenkins Maven build fails with compilation errors after a successful checkout. Write the prompt you would give an AI assistant.',
    probing:
      'A structured prompt with context, the first error, the good-to-bad diff and a requested output format, with secrets removed.',
    answer: [
      'A good prompt gives **context, the exact error, what I already know, and the output I want**. It never includes secrets.',
      'Why this prompt works:',
      "- **Context narrows the search.** Saying checkout succeeded and naming the Java and Maven versions stops generic answers.\n- **The first error matters most.** Later compiler errors are often caused by the first one.\n- **The diff between the good and bad commit** is usually where the cause is.\n- **A clear output format** gives a fix and a way to verify it, not just an explanation.\n- **Remove secrets** (tokens, passwords, internal URLs) before pasting anything into an AI tool, and follow the company's AI usage policy.",
      "I check the AI's answer myself before changing anything. It is a fast first opinion, not the final answer.",
    ],
    code: [
      {
        title: 'Prompt for a failing build',
        language: 'text',
        code: `You are helping me debug a failing Jenkins pipeline.

Context:
- Java Spring Boot application, built with Maven in a Jenkins Declarative Pipeline.
- Agent image: maven:3.9-eclipse-temurin-17. pom.xml sets maven.compiler.release=17.
- Git checkout succeeded. The build fails in the "mvn -B clean package" stage with compilation errors.
- The last successful build was commit <old-sha>. The failing build is commit <new-sha>.

Error log (secrets and internal hostnames removed):
<paste the first error and about 30 lines around it, not the whole log>

Changes between the two commits:
<paste git diff --stat, and the pom.xml diff if there is one>

What I want:
1. The most likely root cause, and why.
2. Other possible causes, in order of likelihood (Java version, dependency versions, generated code, source code).
3. The exact fix, as a code or pom.xml change.
4. Maven commands to confirm the fix locally (for example mvn -v, mvn dependency:tree, mvn -B clean compile).
If you are not sure, say what extra information you need instead of guessing.`,
      },
    ],
    tags: ['ai', 'jenkins', 'troubleshooting'],
  },
  {
    id: 'itv-myfaq-413',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'In a Jenkins Declarative Pipeline, what happens if you do not give `agent`? And if a stage has no `steps`?',
    probing:
      'That both fail validation before the pipeline starts, the exact fixes, and when `agent none` is useful.',
    answer: [
      'Both fail **before the pipeline starts**. Jenkins validates the Declarative syntax first, so nothing runs and no agent is used.',
      '- **`agent` missing at the top level** - error `Missing required section "agent"`. Fix: add `agent any` or a label at the top, or use `agent none` and give each stage its own `agent`.\n- **`steps` missing in a stage** - error `Expected one of "steps", "stages", or "parallel" for stage "Build"`. Fix: put commands like `sh` inside `steps { }`.',
      '**Things to remember:**',
      '- `agent none` at the top is useful when stages need different agents, or when an approval stage should not hold an agent while it waits.\n- A stage needs exactly one of `steps`, `stages` (nested sequential stages), `parallel`, or `matrix`.\n- Scripted Pipelines (`node { }`) do not have these rules. The checks apply only to Declarative syntax.',
    ],
    code: [
      {
        title: 'agent none with per-stage agents',
        language: 'text',
        code: `pipeline {
  agent none                          // no default agent
  stages {
    stage('Build') {
      agent { label 'maven' }         // so each stage must choose one
      steps {
        sh 'mvn -B clean package'
      }
    }
    stage('Approve') {
      agent none                      // no agent needed while waiting
      steps {
        input message: 'Deploy to production?'
      }
    }
  }
}`,
      },
    ],
    tags: ['jenkins', 'declarative pipeline', 'troubleshooting'],
  },
  {
    id: 'itv-myfaq-414',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write a sample `providers.tf` and `versions.tf` for Terraform on Azure.',
    probing:
      'Pinning Terraform and the provider, aliased providers for a second subscription, a remote backend, and no secrets in the provider block.',
    answer: [
      '`versions.tf` pins Terraform and the provider. `providers.tf` configures the provider. `backend.tf` says where the state file lives.',
      '**Things to remember:**',
      '- No secrets in the provider block. Login comes from `az login` locally, and from OIDC (workload identity federation) or a managed identity in the pipeline. With OIDC, the provider reads `ARM_USE_OIDC=true`, `ARM_CLIENT_ID`, and `ARM_TENANT_ID` from the environment.\n- `~> 4.0` allows 4.x updates but not 5.0. Commit `.terraform.lock.hcl` so everyone uses the same provider build.',
    ],
    code: [
      {
        title: 'versions.tf',
        language: 'hcl',
        code: `# versions.tf
terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}`,
      },
      {
        title: 'providers.tf',
        language: 'hcl',
        code: `# providers.tf
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id   # required in azurerm 4.x (or set ARM_SUBSCRIPTION_ID)
}

# Second subscription, used with provider = azurerm.prod
provider "azurerm" {
  alias           = "prod"
  features {}
  subscription_id = var.prod_subscription_id
}`,
      },
      {
        title: 'variables.tf',
        language: 'hcl',
        code: `# variables.tf
variable "subscription_id" {
  type = string
}

variable "prod_subscription_id" {
  type = string
}`,
      },
      {
        title: 'backend.tf',
        language: 'hcl',
        code: `# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "companytfstate"
    container_name       = "tfstate"
    key                  = "dev.tfstate"
    use_azuread_auth     = true
  }
}`,
      },
    ],
    tags: ['terraform', 'azure', 'iac'],
  },
  {
    id: 'itv-myfaq-415',
    level: 'basic',
    kind: 'open',
    prompt: 'Write a Terraform file to create a Resource Group.',
    probing:
      'A minimal resource with tags and an output, the standard command sequence, and how state reacts to drift.',
    answer: [
      'It uses the `versions.tf` and `providers.tf` files: `main.tf` declares the resource group with tags and outputs its ID. I then run `init`, `fmt -check`, `validate`, `plan -out=tfplan`, and apply the saved plan.',
      'If someone deletes the resource group in the portal, the next `terraform plan` shows it will be created again, because the state still has it.',
    ],
    code: [
      {
        title: 'main.tf',
        language: 'hcl',
        code: `# main.tf
resource "azurerm_resource_group" "rg" {
  name     = "rg-payment-dev"
  location = "Central India"

  tags = {
    Environment = "Dev"
    Owner       = "DevOps"
  }
}

output "resource_group_id" {
  value = azurerm_resource_group.rg.id
}`,
      },
      {
        title: 'Run it',
        language: 'bash',
        code: `terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan
terraform apply tfplan`,
      },
    ],
    tags: ['terraform', 'azure', 'iac'],
  },
  {
    id: 'itv-myfaq-416',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you run Terraform from Azure DevOps?',
    probing:
      'Plan in one stage, approve on an environment, apply that exact saved plan, with remote state and a workload identity connection.',
    answer: [
      'Plan in one stage, review and approve, then apply **that exact saved plan**.',
      'The Plan stage runs `init`, `fmt -check`, `validate`, Checkov and `plan -out=tfplan`, then publishes `tfplan` as an artifact. The Apply stage runs only on `main`, as a deployment job on the `prod` environment, which holds the approval check. It downloads the plan, runs `init` again and applies the saved plan.',
    ],
    deeper: [
      '`TerraformTask@5` and `TerraformInstaller@1` come from the Microsoft DevLabs Terraform extension. Use the version installed in your organization.',
      'Remote state in Azure Storage gives locking (blob lease), versioning, and one state key per environment (`dev.tfstate`, `prod.tfstate`).',
      'A deployment job does not check out code, so `checkout: self` is needed before `init`.',
      'The plan file can contain sensitive values. Limit who can read pipeline artifacts.',
      'If the state changed after the plan, Terraform rejects the stale plan. Run the pipeline again.',
      'Dev, QA, and Prod reuse the same stages through a template, each with its own `.tfvars`, state key, and service connection. Only Production needs approval.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Terraform plan and apply',
        caption: 'The approved plan file is the one that gets applied.',
        nodes: [
          { label: 'PR or push to main', tone: 'accent' },
          {
            label: 'Init, fmt, validate, Checkov',
            branch: { label: 'Check fails', detail: 'Stop before plan', tone: 'danger' },
          },
          { label: 'Plan -out=tfplan', detail: 'Publish as artifact' },
          { label: 'Approval on prod environment', tone: 'warning' },
          { label: 'Init, apply tfplan', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `PR / push to main
-> init, fmt -check, validate, Checkov, plan -out=tfplan
-> publish tfplan as an artifact
-> approval on the prod environment
-> init, apply tfplan`,
      },
      {
        title: 'azure-pipelines.yml for Terraform',
        language: 'yaml',
        code: `trigger:
  branches:
    include: [main]
  paths:
    include: [terraform/*]

pool:
  vmImage: ubuntu-latest

variables:
  tfDir: $(System.DefaultWorkingDirectory)/terraform/environments/prod
  serviceConnection: prod-terraform-wif     # ARM connection with workload identity federation

stages:
  - stage: Plan
    jobs:
      - job: Plan
        steps:
          - task: TerraformInstaller@1
            inputs:
              terraformVersion: '<approved-version>'

          - task: TerraformTask@5
            displayName: Init
            inputs:
              provider: azurerm
              command: init
              workingDirectory: $(tfDir)
              backendServiceArm: $(serviceConnection)
              backendAzureRmResourceGroupName: tfstate-rg
              backendAzureRmStorageAccountName: companytfstate
              backendAzureRmContainerName: tfstate
              backendAzureRmKey: prod.tfstate

          - script: |
              terraform fmt -check -recursive
              terraform validate
              pip install checkov && checkov -d . --quiet
            displayName: Format, validate, and scan
            workingDirectory: $(tfDir)

          - task: TerraformTask@5
            displayName: Plan
            inputs:
              provider: azurerm
              command: plan
              workingDirectory: $(tfDir)
              environmentServiceNameAzureRM: $(serviceConnection)
              commandOptions: '-out=tfplan -input=false'

          - publish: $(tfDir)/tfplan
            artifact: tfplan

  - stage: Apply
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: Apply
        environment: prod                    # approval check is set on this environment
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - download: current
                  artifact: tfplan

                - task: TerraformInstaller@1
                  inputs:
                    terraformVersion: '<approved-version>'

                - task: TerraformTask@5
                  displayName: Init
                  inputs:
                    provider: azurerm
                    command: init
                    workingDirectory: $(tfDir)
                    backendServiceArm: $(serviceConnection)
                    backendAzureRmResourceGroupName: tfstate-rg
                    backendAzureRmStorageAccountName: companytfstate
                    backendAzureRmContainerName: tfstate
                    backendAzureRmKey: prod.tfstate

                - task: TerraformTask@5
                  displayName: Apply saved plan
                  inputs:
                    provider: azurerm
                    command: apply
                    workingDirectory: $(tfDir)
                    environmentServiceNameAzureRM: $(serviceConnection)
                    commandOptions: '$(Pipeline.Workspace)/tfplan/tfplan'`,
        placeholders: ['<approved-version>'],
      },
    ],
    followUps: [
      'Why apply a saved plan instead of running `terraform apply` again?',
      'How is the state file locked when two runs start at once?',
    ],
    tags: ['terraform', 'azure devops', 'iac'],
  },
  {
    id: 'itv-myfaq-417',
    level: 'basic',
    kind: 'scenario',
    prompt: 'Your pull request has conflicts with `main`. How do you resolve merge conflicts?',
    probing:
      'Bringing main into the feature branch, resolving by understanding both changes, re-testing, and only force-pushing your own branch with lease.',
    answer: [
      'I bring the latest `main` into my feature branch, fix the conflicts by hand, test, and push. I never resolve by force-pushing over `main`.',
      '`HEAD` is my branch, the other side is the incoming change. I do not blindly pick "ours" or "theirs". I check why each change was made and keep the correct final result, then delete the markers.',
      'Then the PR pipeline runs again, and the reviewer approves.',
      '**Things to remember:**',
      '- Run the tests and build after resolving. A conflict that "looks" fixed can still break the app.\n- After a rebase, only force-push my own feature branch, and use `--force-with-lease`, never plain `--force`.\n- Small, short-lived branches and pulling `main` often mean fewer conflicts.',
    ],
    code: [
      {
        title: 'Bring main into the feature branch',
        language: 'bash',
        code: `git checkout feature/payment
git fetch origin
git merge origin/main        # or: git rebase origin/main
git status                   # shows "both modified" files`,
      },
      {
        title: 'Conflict markers',
        language: 'text',
        code: `<<<<<<< HEAD
replicas: 3
image: payment-api:1.4.1
=======
replicas: 5
image: payment-api:1.4.2
>>>>>>> origin/main`,
      },
      {
        title: 'Finish the merge or rebase',
        language: 'bash',
        code: `git diff --check             # finds leftover conflict markers
git add values.yaml
git commit                   # for a merge
# or: git rebase --continue  # for a rebase
git push                     # after a rebase: git push --force-with-lease`,
      },
      {
        title: 'Useful escape hatches',
        language: 'bash',
        code: `git merge --abort
git rebase --abort`,
      },
    ],
    traps: ['Using plain `--force` after a rebase, or force-pushing over `main`.'],
    tags: ['git', 'merge conflicts', 'pull requests'],
  },
  {
    id: 'itv-myfaq-418',
    level: 'advanced',
    kind: 'open',
    prompt: 'Apart from pre-commit, what other Git hooks and checks are there?',
    probing:
      'Client and server hooks, sharing hooks with the pre-commit framework, and the layers of checks outside Git that cannot be skipped.',
    answer: [
      'Pre-commit is only the first layer. Checks run on the laptop, on the Git server, in CI, in Kubernetes, and in Azure.',
      '**Git hooks and when they run:**',
      '- `pre-commit` - before a commit is created: format, lint, secret scan.\n- `commit-msg` - after the message is written: enforce a format, for example `JIRA-123: message`.\n- `pre-push` - before `git push`: run unit tests or quick validation.\n- `post-merge`, `post-checkout` - after merge or checkout: install dependencies, local setup.\n- `pre-receive`, `update` - on the Git server, before a push is accepted: block pushes to protected branches, reject secrets.\n- `post-receive` - on the server, after a push: notify, trigger a build.',
      'Local hooks live in `.git/hooks` and are not shared. I use the **pre-commit framework** so the whole team runs the same hooks.',
      'On hosted Git (Azure Repos, GitHub, GitLab), I cannot add server-side hooks. Branch policies, push protection, and required status checks do that job.',
    ],
    deeper: [
      'Local hooks can be skipped with `git commit --no-verify`. That is why the same checks also run in CI, where they cannot be skipped.',
      'SonarQube, Trivy, and Checkov are CI gates, not Git hooks.',
      'tfsec is now part of Trivy (`trivy config .`).',
      'Kyverno or Gatekeeper stop a bad manifest at the cluster even if it got past CI. Azure Policy stops a bad resource even if it was created outside Terraform.',
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'Checks inside and outside Git',
        caption: 'Each layer catches what the one before it let through.',
        nodes: [
          { label: 'Laptop', detail: 'pre-commit: fmt, lint, Gitleaks', tone: 'accent' },
          { label: 'Git server', detail: 'Branch policies, push protection' },
          { label: 'CI', detail: 'Tests, SonarQube, Trivy, Checkov' },
          { label: 'Kubernetes', detail: 'Kyverno or Gatekeeper, PSA' },
          { label: 'Azure', detail: 'Azure Policy', tone: 'success' },
        ],
      },
    ],
    code: [
      {
        title: '.pre-commit-config.yaml',
        language: 'yaml',
        code: `# .pre-commit-config.yaml (pin rev to a current release)
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: check-yaml
      - id: check-merge-conflict
      - id: trailing-whitespace
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.24.2
    hooks:
      - id: gitleaks
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.99.0
    hooks:
      - id: terraform_fmt
      - id: terraform_tflint`,
      },
      {
        title: 'Install and run the hooks',
        language: 'bash',
        code: `pre-commit install          # install the hooks for this clone
pre-commit run --all-files`,
      },
      {
        title: 'Checks outside Git',
        language: 'text',
        code: `Laptop      -> pre-commit: fmt, lint, Gitleaks
Git server  -> branch policies, required reviewers, PR build validation, push protection
CI          -> tests, SonarQube Quality Gate, dependency scan, Trivy, Checkov, TFLint, Hadolint, kubeconform
Kubernetes  -> admission control: Kyverno or OPA Gatekeeper, Pod Security Admission
Azure       -> Azure Policy (deny public storage, require tags, allowed regions)`,
      },
    ],
    followUps: [
      'How do you stop someone bypassing hooks with `--no-verify`?',
      'What would you put in a `commit-msg` hook?',
    ],
    tags: ['git', 'hooks', 'devsecops'],
  },
]
