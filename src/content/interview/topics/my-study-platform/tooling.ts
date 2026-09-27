import type { InterviewQuestion } from '../../../types'

/** Delivery tooling: Argo CD GitOps, Jenkins pipelines for AKS, alerting, scanners, Dockerfiles, Docker networks and Ansible. */
export const myStudyPlatformToolingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mystpl-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Explain the end-to-end GitOps workflow with Argo CD.',
    probing:
      'Whether you know CI changes Git and Argo CD reconciles the cluster from it, and who is responsible for what.',
    answer: [
      'GitOps means storing the desired Kubernetes configuration in Git and using a controller such as Argo CD to keep the cluster matched with that configuration.',
      '**Example Release**\nThe developer pushes a change. The CI pipeline:',
      '1. Runs unit tests and security scans.\n2. Builds `myapp:v2`.\n3. Pushes the image to a container registry.\n4. Changes the image tag in the GitOps repository from `v1` to `v2`.\n5. Opens a pull request or commits through an approved automation process.',
      'After the change is merged, Argo CD detects that Git specifies `v2` while the cluster still runs `v1`. It applies the new configuration through the Kubernetes API. Kubernetes creates the new pods, waits for them to become ready, and removes the old pods during a rolling update.\n**Responsibilities**',
      '- **CI system**: Test, scan, build, push the image, and propose or make the manifest change\n- **Git**: Store and review the desired state and its history\n- **Argo CD**: Compare Git with Kubernetes and reconcile differences\n- **Kubernetes**: Schedule pods and run the application rollout',
      '**Short Interview Answer**\nCI tests the code, builds and pushes the image, and updates its tag in the GitOps repository. Argo CD watches that repository and continuously compares the desired state in Git with the actual Kubernetes state. When they differ, it synchronizes the cluster. Argo CD is Kubernetes-focused; it can manage non-Kubernetes infrastructure only indirectly through Kubernetes controllers such as Crossplane.',
    ],
    code: [
      {
        title: 'GitOps flow',
        language: 'text',
        code: `Developer pushes application code
        ↓
CI runs tests and security scans
        ↓
CI builds and pushes a container image
        ↓
CI updates the image tag in the GitOps repository
        ↓
The change is reviewed and merged
        ↓
Argo CD notices the Git change
        ↓
Argo CD compares Git with the cluster
        ↓
Argo CD synchronizes Kubernetes
        ↓
Kubernetes performs the rollout`,
      },
      {
        title: 'Assume the application currently uses',
        language: 'yaml',
        code: `image: myapp:v1
replicas: 3`,
      },
    ],
    tags: ['argo cd', 'gitops', 'kubernetes'],
  },
  {
    id: 'itv-mystpl-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'In a GitOps setup, who commits the image tag change to the GitOps repository?',
    probing:
      'Whether you know Argo CD does not normally write to Git and that a limited bot account or image automation does.',
    answer: [
      'Argo CD does not normally write deployment changes back to Git. The CI pipeline or a separate image-automation tool updates the GitOps repository.',
      'The automation uses a bot or service account with limited permission. A simple CI example is:',
      'Teams can use `yq`, Kustomize, or a Helm values editor instead of a broad text replacement. For production, a pull request and approval are safer than pushing directly to the main branch.',
    ],
    code: [
      {
        title: 'Update image tag',
        language: 'bash',
        code: `git clone https://github.com/company/gitops-repo.git
cd gitops-repo

yq -i '.image.tag = "v2"' environments/dev/values.yaml

git add environments/dev/values.yaml
git commit -m "Deploy myapp v2 to development"
git push origin main`,
      },
    ],
    tags: ['argo cd', 'gitops', 'ci/cd'],
  },
  {
    id: 'itv-mystpl-29',
    level: 'basic',
    kind: 'open',
    prompt: 'Why use separate application and GitOps repositories?',
    probing:
      'Whether you understand separating deployment config gives it its own permissions, history and promotion process.',
    answer: [
      '**Application repository**',
      '- Application source code\n- Tests\n- Dockerfile\n- CI pipeline definition',
      '**GitOps repository**',
      '- Kubernetes manifests\n- Helm values or charts\n- Kustomize bases and overlays\n- Environment-specific configuration',
      'This separation gives deployment configuration its own permissions, history, reviews, and promotion process. A single repository can also work when the team prefers that structure.',
    ],
    tags: ['gitops', 'git', 'argo cd'],
  },
  {
    id: 'itv-mystpl-30',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How does Argo CD handle desired state, drift and self-healing?',
    probing:
      'Whether you know what happens to a manual change when auto-sync and self-heal are enabled.',
    answer: [
      'Git is the desired state. The live cluster is the actual state.',
      'If Git says `replicas: 3` and an administrator manually scales the Deployment to 10, Argo CD reports the application as out of sync. If automatic sync and self-healing are enabled, it changes the cluster back to three replicas.',
      'This makes Git the source of truth. Emergency manual changes should therefore be recorded in Git, or Argo CD may reverse them.',
    ],
    tags: ['argo cd', 'gitops', 'drift'],
  },
  {
    id: 'itv-mystpl-31',
    level: 'advanced',
    kind: 'open',
    prompt: 'What can Argo CD manage, and can it create cloud infrastructure?',
    probing:
      'Whether you know Argo CD only talks to Kubernetes and manages cloud resources only indirectly via controllers like Crossplane.',
    answer: [
      'Argo CD is designed for Kubernetes and can deploy:',
      '- Kubernetes YAML manifests\n- Helm charts\n- Kustomize applications\n- Jsonnet output\n- Custom Resources used by operators',
      'It does not directly create a VM, virtual network, S3 bucket, or Azure SQL database through a cloud provider API. Terraform, OpenTofu, Bicep, Pulumi, or CloudFormation are normally used for that work.',
      'Argo CD can manage cloud infrastructure indirectly. For example, it can deploy Crossplane Custom Resources to Kubernetes, and the Crossplane controllers can then create the cloud resources. In that design, Argo CD still talks only to Kubernetes.',
    ],
    followUps: [
      'How would you combine Terraform and Argo CD in one platform?',
      'What are the risks of managing cloud infrastructure through Crossplane?',
    ],
    tags: ['argo cd', 'crossplane', 'gitops'],
  },
  {
    id: 'itv-mystpl-32',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Walk through a production Jenkins CI/CD pipeline for AKS that tests, scans, builds one image and promotes it to production.',
    probing:
      'Whether you can explain each stage and why the same tested image is promoted rather than rebuilt.',
    answer: [
      'This pipeline tests a Java application, checks code quality and security, builds one Docker image, deploys it to development, and then promotes the same image to production after approval.',
      '**What Each Part Does**',
      '**Agent and tools**\nThe `docker-azure` Jenkins agent must have Java, Maven, Docker, Azure CLI, Helm, kubectl, and Trivy available. The configured SonarQube Jenkins plugin supplies the scanner environment.\n**Pipeline options**',
      '- `disableConcurrentBuilds()` stops two runs of this job from deploying at the same time.\n- `timestamps()` makes troubleshooting easier by adding times to log lines.\n- The pipeline timeout prevents a stuck deployment from running forever.',
      '**Build, test, and quality checks**\n`mvn clean verify` compiles the code, runs tests, and creates the application package. SonarQube then checks code quality, bugs, duplication, and security issues. `waitForQualityGate` stops the pipeline if the project does not meet the configured quality rules. It requires the SonarQube webhook to be configured for Jenkins.',
      '**Security checks**\nOWASP Dependency-Check looks for known vulnerabilities in application dependencies. Trivy scans the final container image. A serious finding causes the pipeline to stop before the image is pushed or deployed.',
      '**Image promotion**\nThe image is tagged with the Jenkins build number and pushed to ACR. Development and production use the exact same image tag. Production is not rebuilt, so the tested artifact is the artifact that is promoted.',
      '**Deployment and verification**\nHelm installs the application if it is new or upgrades it if it already exists. `--wait` and `kubectl rollout status` confirm that Kubernetes completed the rollout. Smoke tests check that the running application responds successfully.',
      '**Production Improvements**',
      '- Use a Jenkins credential, workload identity, or managed identity instead of storing Azure credentials in the Jenkinsfile.\n- Allow production deployment only from an approved branch or release tag.\n- Add the Git commit SHA to the image tag or labels for traceability.\n- Add secret scanning and Infrastructure-as-Code scanning when those files are present.\n- Send success and failure notifications to Teams, Slack, or email.\n- Store scan reports as Jenkins artifacts for auditing.\n- Use canary or blue-green deployment when a normal rolling update is too risky.\n- Consider GitOps: Jenkins updates the image tag in a deployment repository, and Argo CD deploys it instead of Jenkins running Helm directly.',
      '**Short Interview Answer**\nThis Jenkins pipeline checks out the code, builds and tests it with Maven, runs SonarQube analysis and a quality gate, scans dependencies and the Docker image, and pushes the image to ACR. It deploys the image to development AKS with Helm, verifies it with rollout and smoke tests, pauses for approval, and promotes the same tested image to production. Credentials should come from secure identity or secret management rather than being hardcoded.',
    ],
    code: [
      {
        title: 'Jenkins pipeline for AKS',
        language: 'text',
        code: `Git checkout
    ↓
Compile and unit test
    ↓
SonarQube analysis and quality gate
    ↓
Dependency vulnerability scan
    ↓
Build and scan Docker image
    ↓
Push image to Azure Container Registry
    ↓
Deploy to development AKS with Helm
    ↓
Verify rollout and run smoke test
    ↓
Manual production approval
    ↓
Deploy the same image to production
    ↓
Verify rollout and run smoke test`,
      },
      {
        title: 'Example Declarative Pipeline',
        language: 'text',
        code: `pipeline {
    agent { label 'docker-azure' }

    options {
        disableConcurrentBuilds()
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

        stage('Dependency Scan') {
            steps {
                sh 'mvn -B org.owasp:dependency-check-maven:check'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $REGISTRY/$IMAGE_NAME:$IMAGE_TAG .'
            }
        }

        stage('Scan Docker Image') {
            steps {
                sh '''
                    trivy image --exit-code 1 \\
                      --severity HIGH,CRITICAL \\
                      $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
                '''
            }
        }

        stage('Push Image to ACR') {
            steps {
                sh '''
                    az acr login --name $ACR_NAME
                    docker push $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
                '''
            }
        }

        stage('Deploy Development') {
            steps {
                sh '''
                    az aks get-credentials \\
                      --resource-group <development-resource-group> \\
                      --name <development-aks-name> \\
                      --overwrite-existing

                    helm upgrade --install orders-api ./helm/orders-api \\
                      --namespace development \\
                      --create-namespace \\
                      --set image.repository=$REGISTRY/$IMAGE_NAME \\
                      --set image.tag=$IMAGE_TAG \\
                      --wait \\
                      --timeout 10m

                    kubectl rollout status deployment/orders-api \\
                      --namespace development \\
                      --timeout=10m
                '''
            }
        }

        stage('Development Smoke Test') {
            steps {
                sh 'curl --fail --retry 5 http://orders-api-dev/actuator/health'
            }
        }

        stage('Approve Production') {
            input {
                message 'Deploy this tested image to production?'
                ok 'Deploy'
                submitter 'production-approvers'
            }
            steps {
                echo 'Production deployment approved'
            }
        }

        stage('Deploy Production') {
            steps {
                sh '''
                    az aks get-credentials \\
                      --resource-group <production-resource-group> \\
                      --name <production-aks-name> \\
                      --overwrite-existing

                    helm upgrade --install orders-api ./helm/orders-api \\
                      --namespace production \\
                      --create-namespace \\
                      --set image.repository=$REGISTRY/$IMAGE_NAME \\
                      --set image.tag=$IMAGE_TAG \\
                      --wait \\
                      --timeout 10m

                    kubectl rollout status deployment/orders-api \\
                      --namespace production \\
                      --timeout=10m
                '''
            }
        }

        stage('Production Smoke Test') {
            steps {
                sh 'curl --fail --retry 5 https://orders.company.com/actuator/health'
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true,
                  testResults: 'target/surefire-reports/*.xml'
        }
        success {
            echo 'Build and deployment succeeded'
        }
        failure {
            echo 'Build or deployment failed'
        }
    }
}`,
      },
    ],
    followUps: [
      'How would you switch this pipeline to a GitOps deployment with Argo CD?',
      'Why does `waitForQualityGate` need a SonarQube webhook?',
    ],
    tags: ['jenkins', 'aks', 'helm', 'ci/cd'],
  },
  {
    id: 'itv-mystpl-33',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Walk me through a basic Jenkins declarative pipeline that tests, builds a Docker image, pushes it to ACR and deploys to AKS.',
    probing:
      'Whether you can explain a pipeline stage by stage instead of reading code line by line.',
    answer: [
      '**How to explain it in an interview**\nExplain it stage by stage instead of reading the code line by line.',
      "**Agent**\n`agent { label 'docker-azure' }`",
      '- The pipeline runs on a Jenkins agent named `docker-azure`.\n- This agent should have Docker, Azure CLI, Helm, kubectl, and Maven installed.',
      '**Options in the pipeline**',
      '- `disableConcurrentBuilds()` prevents multiple builds of the same job from running simultaneously.\n- `timestamps()` adds timestamps to Jenkins logs for easier troubleshooting.',
      '**Environment variables**\nThese variables are reused throughout the pipeline.',
      'Final Docker image: `myacr.azurecr.io/orders-api:105`',
      '**Checkout stage** - Jenkins pulls the latest application source code from the Git repository configured for the job.',
      '**Test stage** - `mvn -B clean verify` cleans previous builds, compiles the application and runs unit tests. If any test fails, the pipeline stops here.',
      '**Build Docker image**\n**Push image to ACR** - login to Azure Container Registry, then push the Docker image. The image `myacr.azurecr.io/orders-api:105` is now stored in ACR.',
      '**Deploy to Development AKS** - `az aks get-credentials` downloads the Kubernetes credentials so Jenkins can access the Development AKS cluster. `helm upgrade --install` deploys or upgrades the application using the Helm chart. `kubectl rollout status` waits until the deployment completes successfully.',
      '**Manual approval** - the pipeline pauses. Only users in the `production-approvers` group can approve. This is a common production safety check.',
      '**Deploy to Production** - exactly the same process as Development, except it connects to the Production AKS cluster, deploys to the production namespace, and uses the same Docker image that was tested in Development. This ensures the exact tested artifact is promoted to Production.',
      '**Post section** - `junit` publishes JUnit test reports in Jenkins. Even if the build fails, Jenkins still displays the test results.',
      '**Interview explanation (1-minute answer)**\n"This is a Jenkins Declarative Pipeline that automates the complete CI/CD process. It first checks out the code from Git, builds and tests the application using Maven, then creates a Docker image and pushes it to Azure Container Registry. Next, it deploys the image to the Development AKS cluster using Helm and verifies the rollout. After successful testing, the pipeline pauses for manual approval before promoting the same Docker image to the Production AKS cluster. Finally, it publishes the JUnit test reports. Using the same image for both environments ensures consistency and avoids environment-specific build differences."',
    ],
    code: [
      {
        title: 'Basic pipeline',
        language: 'text',
        code: `pipeline {
  agent { label 'docker-azure' }

  options {
    disableConcurrentBuilds()
    timestamps()
  }

  environment {
    ACR_NAME = '<acr-name>'
    REGISTRY = '<acr-name>.azurecr.io'
    IMAGE_NAME = 'orders-api'
    IMAGE_TAG = "\${BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test') {
      steps {
        sh 'mvn -B clean verify'
      }
    }

    stage('Build Image') {
      steps {
        sh 'docker build -t $REGISTRY/$IMAGE_NAME:$IMAGE_TAG .'
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
            --resource-group <development-resource-group> \\
            --name <development-aks-name> \\
            --overwrite-existing

          helm upgrade --install orders-api ./helm/orders-api \\
            --namespace development \\
            --create-namespace \\
            --set image.repository=$REGISTRY/$IMAGE_NAME \\
            --set image.tag=$IMAGE_TAG \\
            --wait

          kubectl rollout status deployment/orders-api \\
            --namespace development
        '''
      }
    }

    stage('Approve Production') {
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
      steps {
        sh '''
          az aks get-credentials \\
            --resource-group <production-resource-group> \\
            --name <production-aks-name> \\
            --overwrite-existing

          helm upgrade --install orders-api ./helm/orders-api \\
            --namespace production \\
            --create-namespace \\
            --set image.repository=$REGISTRY/$IMAGE_NAME \\
            --set image.tag=$IMAGE_TAG \\
            --wait

          kubectl rollout status deployment/orders-api \\
            --namespace production
        '''
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'target/surefire-reports/*.xml'
    }
  }
}`,
      },
      {
        title: 'Environment variables',
        language: 'text',
        code: `ACR Name = myacr
Registry = myacr.azurecr.io
Image    = orders-api
Tag      = Jenkins Build Number (for example, 105)`,
      },
      {
        title: 'Build Docker image',
        language: 'bash',
        code: `docker build -t myacr.azurecr.io/orders-api:105 .`,
      },
      {
        title: 'Overall flow',
        language: 'text',
        code: `Developer
      |
      v
Git Repository
      |
      v
Jenkins Checkout
      |
      v
Maven Build & Unit Tests
      |
      v
Docker Build
      |
      v
Push Image to Azure Container Registry (ACR)
      |
      v
Deploy to Development AKS (Helm)
      |
      v
Verify Rollout
      |
      v
Manual Approval
      |
      v
Deploy to Production AKS (Helm)
      |
      v
Verify Rollout
      |
      v
Publish Test Reports`,
      },
    ],
    tags: ['jenkins', 'aks', 'acr', 'pipelines'],
  },
  {
    id: 'itv-mystpl-34',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What is the basic Jenkins pipeline for AKS missing, and what does an enterprise version with SonarQube and quality gates look like?',
    probing:
      'Whether you know the enterprise stages - quality gates, dependency and image scans, smoke tests, notifications - and why each matters.',
    answer: [
      'For a production-grade DevOps pipeline, the basic pipeline is missing a few important stages:',
      '1. Checkout\n2. Dependency download / cache (optional)\n3. Compile\n4. Unit tests\n5. **SonarQube static code analysis**\n6. **Quality gate validation**\n7. Package application\n8. **Dependency vulnerability scan** (OWASP Dependency Check or Snyk)\n9. Build Docker image\n10. **Docker image vulnerability scan** (Trivy / Grype)\n11. Push image to Azure Container Registry\n12. Deploy to Development\n13. **Smoke tests / API health check**\n14. Manual approval\n15. Deploy to Production\n16. Rollout verification\n17. **Post-deployment smoke test**\n18. Publish test reports\n19. **Notifications** (Email / Slack / Teams)',
      'This is the typical enterprise CI/CD flow.',
      "**Additional enterprise improvements**\nIf you're targeting senior DevOps or Azure DevOps interviews, you can also mention these practices:",
      '- **Secrets management:** retrieve credentials from Azure Key Vault instead of hardcoding them.\n- **Branch strategy:** deploy to production only from the main branch, with feature branches deploying to development or test environments.\n- **Image tagging:** tag images with both the build number and the Git commit SHA (for example, `105` and `a1b2c3d`) to improve traceability.\n- **Artifact repository:** publish JAR/WAR artifacts to repositories like Nexus or Artifactory before building container images.\n- **GitOps deployment:** instead of Jenkins running `helm upgrade` directly, update the Helm values in a GitOps repository and let tools like Argo CD or Flux CD synchronize the changes to AKS.\n- **Security scanning:** add secret scanning (Gitleaks), container configuration scanning (Trivy), and Infrastructure-as-Code scanning (Checkov or tfsec) as part of the pipeline.\n- **Notifications:** send build and deployment status to Microsoft Teams, Slack, or email.\n- **Progressive delivery:** use blue-green or canary deployments for production releases to minimize risk.',
      "This version is much closer to what you'll see in enterprise environments and is suitable for discussing in DevOps interviews.",
    ],
    code: [
      {
        title: 'Enterprise Jenkins pipeline (with SonarQube and quality gates)',
        language: 'text',
        code: `pipeline {
    agent { label 'docker-azure' }

    options {
        disableConcurrentBuilds()
        timestamps()
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
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Compile') {
            steps {
                sh 'mvn clean compile'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'mvn test'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv("\${SONARQUBE_SERVER}") {
                    sh '''
                    mvn sonar:sonar \\
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

        stage('Package') {
            steps {
                sh 'mvn package -DskipTests'
            }
        }

        stage('Dependency Vulnerability Scan') {
            steps {
                sh '''
                mvn org.owasp:dependency-check-maven:check
                '''
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                docker build \\
                -t $REGISTRY/$IMAGE_NAME:$IMAGE_TAG .
                '''
            }
        }

        stage('Docker Image Scan') {
            steps {
                sh '''
                trivy image \\
                --exit-code 1 \\
                --severity HIGH,CRITICAL \\
                $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
                '''
            }
        }

        stage('Push to ACR') {
            steps {
                sh '''
                az acr login --name $ACR_NAME

                docker push \\
                $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
                '''
            }
        }

        stage('Deploy Development') {
            steps {
                sh '''
                az aks get-credentials \\
                --resource-group <dev-rg> \\
                --name <dev-aks> \\
                --overwrite-existing

                helm upgrade --install orders-api ./helm/orders-api \\
                --namespace development \\
                --create-namespace \\
                --set image.repository=$REGISTRY/$IMAGE_NAME \\
                --set image.tag=$IMAGE_TAG \\
                --wait
                '''
            }
        }

        stage('Verify Rollout') {
            steps {
                sh '''
                kubectl rollout status deployment/orders-api \\
                -n development
                '''
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                curl -f http://orders-api-dev/actuator/health
                '''
            }
        }

        stage('Production Approval') {
            input {
                message 'Deploy to Production?'
                ok 'Deploy'
                submitter 'production-approvers'
            }
            steps {
                echo "Approved"
            }
        }

        stage('Deploy Production') {
            steps {
                sh '''
                az aks get-credentials \\
                --resource-group <prod-rg> \\
                --name <prod-aks> \\
                --overwrite-existing

                helm upgrade --install orders-api ./helm/orders-api \\
                --namespace production \\
                --create-namespace \\
                --set image.repository=$REGISTRY/$IMAGE_NAME \\
                --set image.tag=$IMAGE_TAG \\
                --wait
                '''
            }
        }

        stage('Verify Production Rollout') {
            steps {
                sh '''
                kubectl rollout status deployment/orders-api \\
                -n production
                '''
            }
        }

        stage('Production Smoke Test') {
            steps {
                sh '''
                curl -f https://orders.company.com/actuator/health
                '''
            }
        }

    }

    post {

        always {
            junit 'target/surefire-reports/*.xml'
        }

        success {
            echo 'Deployment Successful'
        }

        failure {
            echo 'Deployment Failed'
        }
    }
}`,
      },
    ],
    followUps: [
      'Where would you add secret scanning with Gitleaks?',
      'How would you implement a canary release from Jenkins?',
    ],
    tags: ['jenkins', 'sonarqube', 'devsecops'],
  },
  {
    id: 'itv-mystpl-35',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you configure alerts in Prometheus and Grafana, and which should you use?',
    probing:
      'Whether you know Alertmanager handles routing, grouping and silencing, and when Grafana alerting fits better.',
    answer: [
      'You can configure alerts in both Prometheus and Grafana, but they serve slightly different purposes.',
      '**Prometheus alerting (recommended)**\nPrometheus uses Alertmanager for alerting. Example alerts:',
      '- CPU > 80% for 5 minutes\n- Memory > 80%\n- Pod in CrashLoopBackOff\n- Node NotReady\n- Disk usage > 90%\n- Deployment replicas unavailable',
      'Prometheus continuously evaluates alert rules written in PromQL. When a condition is met, it sends the alert to Alertmanager, which handles routing, grouping, silencing, and notifications.',
      '**Grafana alerting**\nGrafana can also create alerts based on data from Prometheus (or other data sources). Example:',
      '- High application response time\n- HTTP 5xx error rate\n- Dashboard panel threshold exceeded',
      'Grafana sends notifications directly to Email, Microsoft Teams, Slack, PagerDuty or Webhooks.',
      '**Which one should you use?**',
      '- **Prometheus + Alertmanager:** best for infrastructure and Kubernetes alerts. It is the standard choice in production.\n- **Grafana:** best for dashboard-based alerts and when you have multiple data sources besides Prometheus.',
      '**Interview answer**\n"Alerts can be configured in both Prometheus and Grafana. In production, I typically use Prometheus Alertmanager for Kubernetes and infrastructure alerts because it evaluates PromQL rules and provides features like grouping, routing, and silencing before sending notifications to Teams, Slack, or email. Grafana also supports alerting, and I mainly use it for dashboard-based or application-level alerts. Both integrate well with Prometheus, but Alertmanager is generally the preferred solution for Kubernetes monitoring."',
    ],
    code: [
      {
        title: 'Prometheus alerting (recommended): Flow',
        language: 'text',
        code: `Prometheus -> Alert Rules -> Alertmanager -> Email/Slack/Teams/PagerDuty`,
      },
    ],
    tags: ['prometheus', 'grafana', 'alerting'],
  },
  {
    id: 'itv-mystpl-36',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are tfsec, Checkov and Trivy, and how do they differ?',
    probing: 'Whether you know which tool scans what and where each belongs in a pipeline.',
    answer: [
      'These are all Infrastructure as Code (IaC) security scanning tools, but they have different purposes.',
      '**tfsec**\ntfsec scans Terraform code for security misconfigurations before deployment. It checks whether your infrastructure follows security best practices.',
      '**Examples of issues it detects**',
      '- Storage Account allows public access.\n- Security Group exposes SSH (port 22) to the internet.\n- Azure Key Vault has public network access enabled.\n- Encryption is not enabled.\n- Logging is disabled.',
      'Run: `tfsec .`\n**Checkov**\nCheckov is a policy-as-code security scanner developed by Bridgecrew (Palo Alto Networks). It scans multiple Infrastructure as Code frameworks, not just Terraform. It supports:',
      '- Terraform\n- Kubernetes YAML\n- Helm Charts\n- CloudFormation\n- ARM Templates\n- Bicep\n- Dockerfiles',
      "**Example**\nSuppose your AKS cluster doesn't have RBAC enabled or your Storage Account allows public access.",
      'Running: `checkov -d .` reports these security issues before deployment.\n**Why use it?**',
      '- Broader support than tfsec.\n- Large library of built-in security policies.\n- Can enforce compliance standards like CIS benchmarks.',
      '**Trivy**\nTrivy is a vulnerability scanner developed by Aqua Security.',
      'Unlike tfsec and Checkov, Trivy focuses on container images, filesystems, Kubernetes clusters, and also supports IaC scanning. It checks:',
      '- Docker images for known CVEs.\n- Kubernetes manifests.\n- Terraform files.\n- Secrets accidentally committed to code.\n- Open-source dependencies.',
      '**Example**\nIt reports vulnerabilities such as Critical, High, Medium and Low. This helps prevent deploying vulnerable images.\n**Comparison**',
      '- **tfsec**: Primary Purpose: Terraform security scanning; Supports: Terraform\n- **Checkov**: Primary Purpose: Multi-IaC security and compliance; Supports: Terraform, Kubernetes, Helm, CloudFormation, ARM, Bicep, Dockerfile\n- **Trivy**: Primary Purpose: Vulnerability scanning; Supports: Container images, filesystems, Kubernetes clusters, IaC, secrets, dependencies',
      '**Interview answer**\n"tfsec and Checkov are Infrastructure as Code security scanners that check Terraform code for misconfigurations before deployment, such as public storage accounts or open security groups. Checkov supports more frameworks than tfsec, including Kubernetes, Helm and Dockerfiles, and can enforce compliance standards like CIS. Trivy is different - it is mainly a vulnerability scanner for container images, and it also scans filesystems, Kubernetes clusters, IaC files and committed secrets. In a pipeline, I run tfsec or Checkov on the Terraform code and Trivy on the built Docker image before pushing it to ACR."',
    ],
    code: [
      {
        title: 'Scan a Docker image',
        language: 'bash',
        code: `trivy image myacr.azurecr.io/orders-api:v1`,
      },
    ],
    tags: ['tfsec', 'checkov', 'trivy', 'devsecops'],
  },
  {
    id: 'itv-mystpl-37',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between COPY and ADD in a Dockerfile?',
    probing: "Whether you know ADD's extra behaviours and why COPY is the default choice.",
    answer: [
      'Both `COPY` and `ADD` copy files from the host machine into the Docker image. The difference is that `ADD` has extra features, while `COPY` simply copies files.',
      '- **Copy local files**: COPY: Yes; ADD: Yes\n- **Copy directories**: COPY: Yes; ADD: Yes\n- **Extract local tar files automatically**: COPY: No; ADD: Yes\n- **Download files from URL**: COPY: No; ADD: Yes\n- **Recommended for most cases**: COPY: Yes; ADD: No',
      '**COPY**\nSimply copies files or folders. `COPY app.py /app/`',
      'Nothing else happens.',
      '**ADD**\n`ADD` can do everything `COPY` does, plus:',
      '**ADD extra 1: automatically extract tar files**\n`ADD project.tar.gz /app/`',
      'Instead of copying the archive `project.tar.gz`, Docker extracts it automatically.',
      '**ADD extra 2: download from URL**\n`ADD https://example.com/file.txt /tmp/`',
      'Docker downloads the file into the image. This is rarely recommended because it makes builds less predictable.',
      '**Which one should you use?**\nUse `COPY` by default.',
      'Use `ADD` only when you specifically need:',
      '- Automatic extraction of local tar archives.\n- Its extra functionality (though downloading via `RUN curl` or `wget` is usually preferred for better control).',
      '**Interview answer**\n"COPY simply copies files and directories into the image. ADD has additional features like automatically extracting local tar archives and supporting URL sources. In production, I prefer COPY because it is simpler, more predictable, and follows Docker best practices."',
      '**Interview answer**\n"**COPY vs ADD:** COPY only copies files and directories and is the preferred choice for most Dockerfiles because it\'s simple and predictable. ADD provides extra features like extracting local tar archives automatically and supporting URL sources, so I use it only when those features are required.',
    ],
    code: [
      {
        title: 'COPY: Copies',
        language: 'text',
        code: `Host
 └── app.py

   |
   v

Container
 └── /app/app.py`,
      },
      {
        title: 'ADD extra 1: automatically extract tar files: Result',
        language: 'text',
        code: `/app/
    src/
    config/
    images/`,
      },
    ],
    tags: ['docker', 'dockerfile'],
  },
  {
    id: 'itv-mystpl-38',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between CMD and ENTRYPOINT in a Dockerfile?',
    probing:
      'Whether you can predict what `docker run` executes when ENTRYPOINT and CMD are combined and arguments are passed.',
    answer: [
      'This is about how a container starts.',
      '**CMD**\nCMD provides the default command.',
      'Running: `docker run myimage`',
      'Output: `Hello World`',
      'You can override CMD: `docker run myimage ls`',
      'The `echo` command is replaced by `ls`.',
      '**ENTRYPOINT**\nENTRYPOINT defines the main executable of the container.',
      'Run: `docker run myimage Hello` Output: `Hello`',
      'Docker appends the supplied arguments to the ENTRYPOINT command.',
      'Trying: `docker run myimage ls` produces: `ls` because Docker runs `echo ls`.',
      '**CMD + ENTRYPOINT together**\nThis is the most common pattern.',
      'Run: `docker run myimage` Output: `Hello`',
      'Run: `docker run myimage Docker` Output: `Docker`',
      'Docker executes `ENTRYPOINT + CMD`, or, if arguments are provided, `ENTRYPOINT + user arguments`.',
      '**Real production example**\nRun: `docker run myapp`',
      'Docker executes: `java -jar app.jar`',
      'If you need to pass application arguments:',
      '**When to use which?**\nUse CMD when:',
      '- You want to provide a default command.\n- Users should be able to replace it easily.',
      '`CMD ["python", "app.py"]`',
      'Use ENTRYPOINT (instead of CMD) when:',
      '- The container should always run a specific application.\n- Users may pass additional arguments to that application.',
      '**Quick comparison: CMD vs ENTRYPOINT**',
      '- **Purpose**: CMD: Default command; ENTRYPOINT: Main executable\n- **Can be overridden by `docker run` arguments?**: CMD: Yes; ENTRYPOINT: No (unless `--entrypoint` is used)\n- **Receives runtime arguments**: CMD: No - replaced by them; ENTRYPOINT: Yes - appends them\n- **Typical use**: CMD: Default behaviour; ENTRYPOINT: Fixed application startup',
      '**Interview answer**\n**CMD vs ENTRYPOINT:** CMD defines the default command that can be overridden when starting the container. ENTRYPOINT defines the container\'s main executable and is intended to always run. A common production pattern is to use ENTRYPOINT for the application (for example, `java -jar app.jar`) and CMD to provide default arguments that users can override."',
    ],
    code: [
      {
        title: 'CMD',
        language: 'dockerfile',
        code: `FROM ubuntu

CMD ["echo", "Hello World"]`,
      },
      {
        title: 'CMD: Output',
        language: 'text',
        code: `bin
etc
home
tmp`,
      },
      {
        title: 'ENTRYPOINT',
        language: 'dockerfile',
        code: `FROM ubuntu

ENTRYPOINT ["echo"]`,
      },
      {
        title: 'CMD + ENTRYPOINT together',
        language: 'dockerfile',
        code: `FROM ubuntu

ENTRYPOINT ["echo"]

CMD ["Hello"]`,
      },
      {
        title: 'Real production example',
        language: 'dockerfile',
        code: `FROM eclipse-temurin:21

COPY app.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]`,
      },
      {
        title: 'If you need to pass application arguments',
        language: 'bash',
        code: `docker run myapp --spring.profiles.active=prod`,
      },
      {
        title: 'Docker executes',
        language: 'text',
        code: `java -jar app.jar --spring.profiles.active=prod`,
      },
      {
        title: 'When to use which?',
        language: 'dockerfile',
        code: `ENTRYPOINT ["nginx", "-g", "daemon off;"]`,
      },
    ],
    tags: ['docker', 'dockerfile'],
  },
  {
    id: 'itv-mystpl-39',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the Docker network types, and which one do you use?',
    probing:
      'Whether you know the five drivers, when each fits, and that Kubernetes uses CNI instead.',
    answer: [
      'Docker provides several network drivers that define how containers communicate with each other and the outside world.',
      '**Bridge network (most common)**\nThis is the default network created by Docker.',
      '- Containers on the same bridge network can communicate with each other.\n- External access is provided using port mapping (`-p`).\n- Best suited for standalone applications running on a single host.',
      '**Use case:** web applications, APIs, databases running on a single Docker host.',
      "**Host network**\nThe container shares the host's network stack.",
      '- No separate container IP.\n- No NAT or port mapping required.\n- Better network performance.\n- Only one service can use a given port on the host.',
      '`docker run --network host nginx`',
      '**Use case:** high-performance networking applications.',
      '**None network**\nThe container has no network connectivity.',
      '- No internet access.\n- No communication with other containers.',
      '`docker run --network none nginx`',
      '**Use case:** secure batch jobs or isolated containers.',
      '**Overlay network**\nUsed when containers run on multiple Docker hosts.',
      '- Enables communication across different hosts.\n- Commonly used with Docker Swarm.',
      '**Use case:** multi-host container deployments.',
      '**Macvlan network**\nAssigns a unique MAC and IP address to each container.',
      '- Containers appear as physical devices on the network.\n- Communicate directly with the LAN.',
      '**Use case:** legacy applications requiring direct network access.',
      '**Which one do you use?**\n"In my projects, I primarily use the Bridge network because most of our Docker containers run on a single host during development or in CI/CD pipelines. It provides isolated networking, and I expose only the required ports using `-p`. For Kubernetes deployments, I don\'t manage Docker networking directly because Kubernetes uses its own Container Network Interface (CNI) plugins such as Azure CNI or Calico to handle pod networking."',
      '**Follow-up: how do containers communicate on a bridge network?**\nContainers connected to the same bridge network can communicate using container names because Docker provides an internal DNS service.',
      'The web container can connect to the database using: `db:3306` instead of using an IP address.\n**Quick summary**',
      '- **Bridge**: Description: Default isolated network on one host; Typical Use: Most commonly used\n- **Host**: Description: Shares host network; Typical Use: High-performance apps\n- **None**: Description: No networking; Typical Use: Isolated containers\n- **Overlay**: Description: Multi-host networking; Typical Use: Docker Swarm\n- **Macvlan**: Description: Container gets its own MAC/IP; Typical Use: Legacy or direct LAN access',
      '**Short interview conclusion**\n"Docker supports Bridge, Host, None, Overlay, and Macvlan networks. I mostly use the Bridge network for standalone containers because it provides secure communication between containers on the same host while allowing controlled external access through port mapping. For Kubernetes environments, networking is managed by the cluster\'s CNI plugin rather than Docker network drivers."',
    ],
    code: [
      {
        title: 'Bridge network (most common)',
        language: 'bash',
        code: `docker network create my-bridge

docker run -d --network my-bridge nginx`,
      },
      {
        title: 'Overlay network',
        language: 'bash',
        code: `docker network create -d overlay my-overlay`,
      },
      {
        title: 'Follow-up: how do containers communicate on a bridge network?',
        language: 'bash',
        code: `docker network create app-network

docker run -d --name db --network app-network mysql

docker run -d --name web --network app-network nginx`,
      },
    ],
    tags: ['docker', 'networking'],
  },
  {
    id: 'itv-mystpl-40',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the core Ansible concepts?',
    probing:
      'Whether you can place control node, inventory, modules, tasks, plays, playbooks, roles and collections in one picture.',
    answer: [
      '- **Control node**: The machine where `ansible-core`, inventories, collections, and playbooks are installed\n- **Managed node**: A target host managed by Ansible - a permanently installed Ansible agent is normally not required\n- **Inventory**: Hosts, groups, and connection/group variables\n- **Module**: Reusable code that performs one focused operation, such as managing a package, file, user, or service\n- **Task**: One call to a module with arguments\n- **Play**: Maps an ordered list of tasks/roles to a host pattern\n- **Playbook**: One or more plays stored as YAML\n- **Role**: A standard directory structure for reusable tasks, handlers, defaults, variables, templates, and files\n- **Collection**: A distributable package containing modules, plugins, roles, and documentation',
      'The relationship between them, from largest to smallest unit of work:',
      'The inventory is what tells Ansible which managed nodes a play should run against - it sits alongside this chain rather than inside it.',
    ],
    code: [
      {
        title: 'Ansible hierarchy',
        language: 'text',
        code: `Collection
   |
   v
Role
   |
   v
Playbook
   |
   v
Play
   |
   v
Task
   |
   v
Module
   |
   v
Managed Node`,
      },
    ],
    tags: ['ansible', 'fundamentals'],
  },
  {
    id: 'itv-mystpl-41',
    level: 'basic',
    kind: 'open',
    prompt: 'What are Ansible ad-hoc commands, and when do you use `command` vs `shell`?',
    probing:
      'Whether you know ad-hoc syntax, privilege escalation with `-b`, and when a playbook is the better tool.',
    answer: [
      'Ad-hoc commands are one-line Ansible commands used for quick administrative or troubleshooting tasks, without writing a playbook.',
      '`-b` (`--become`) requests privilege escalation - most of these package/service/file operations need root.',
      '**`command` vs `shell`**',
      '- `command` is for straightforward commands with no shell features involved.\n- `shell` is used when shell features such as pipes, redirection, and shell operators are required.',
      'Ad-hoc commands are best for quick, one-off operations. Playbooks are better for repeatable, complex automation that needs to be version-controlled and reviewed.',
    ],
    code: [
      {
        title: 'Ad-hoc commands: Basic syntax',
        language: 'bash',
        code: `ansible <host-pattern> -m <module> -a "<arguments>"`,
      },
      {
        title: 'Ad-hoc commands: Examples',
        language: 'bash',
        code: `ansible all -m ping

ansible all -m shell -a "df -h"

ansible all -m shell -a "free -m"

ansible all -m command -a "uptime"

ansible webservers -m ansible.builtin.package -a "name=nginx state=present" -b

ansible webservers -m ansible.builtin.service -a "name=nginx state=started" -b

ansible webservers -m ansible.builtin.service -a "name=nginx state=restarted" -b

ansible webservers -m ansible.builtin.service -a "name=nginx"

ansible webservers -m ansible.builtin.file -a "path=/opt/myapp state=directory mode=0755" -b

ansible webservers -m ansible.builtin.copy -a "src=app.conf dest=/etc/myapp/app.conf" -b`,
      },
    ],
    tags: ['ansible', 'ad-hoc'],
  },
  {
    id: 'itv-mystpl-42',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you install the right web server package across Debian and RedHat hosts with one Ansible task?',
    probing:
      'Whether you use gathered facts like `ansible_os_family` as a lookup key instead of many `when` conditions.',
    answer: [
      'A common real-world requirement: install "the web server package" across a mixed fleet of Debian- and RedHat-family hosts, where the package name differs per distribution family.',
      '`gather_facts: true` collects information such as `ansible_os_family`, `ansible_distribution`, hostname, IP addresses, and memory/CPU information. `ansible_os_family` is then used as the lookup key into the `web_package_by_os` dictionary:',
      'This is the idiomatic way to write one task that behaves correctly across different Linux families, instead of branching with `when` conditions for every package name.',
    ],
    code: [
      {
        title: 'OS-specific variables',
        language: 'yaml',
        code: `---
- name: Configure web servers
  hosts: webservers
  become: true
  gather_facts: true

  vars:
    web_package_by_os:
      Debian: nginx
      RedHat: httpd

  tasks:
    - name: Install web server
      ansible.builtin.package:
        name: "{{ web_package_by_os[ansible_os_family] }}"
        state: present`,
      },
      {
        title: 'OS-specific variables (2)',
        language: 'text',
        code: `Debian  -> nginx
RedHat  -> httpd`,
      },
    ],
    tags: ['ansible', 'facts', 'variables'],
  },
  {
    id: 'itv-mystpl-43',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Walk through an Ansible playbook that installs Nginx, deploys a validated config and reloads only on change.',
    probing:
      'Whether you understand `serial`, `template` with `validate`, handlers and reload vs restart.',
    answer: [
      'A realistic playbook: install Nginx, push a validated configuration template, and reload only when the configuration actually changes.',
      'What each piece is doing:',
      '- `hosts: web` - run against the `web` inventory group.\n- `become: true` - enables privilege escalation.\n- `serial: 2` - updates two servers at a time instead of the whole fleet at once, so a bad config doesn\'t take down every web server simultaneously.\n- `package` - installs Nginx idempotently (no-op if already installed).\n- `template` - renders `nginx.conf.j2` and deploys it to `/etc/nginx/nginx.conf`.\n- `validate: "nginx -t -c %s"` - runs `nginx -t` against the rendered file **before** it replaces the live configuration. If validation fails, the file is never put in place and the play fails safely.\n- `notify: Reload Nginx` - triggers the handler only when the `template` task actually changes the file - not on every run.\n- `service` - ensures Nginx is running and enabled at boot.\n- The handler reloads Nginx (rather than restarting it), which is cheaper and doesn\'t drop existing connections.',
    ],
    code: [
      {
        title: 'Nginx playbook',
        language: 'yaml',
        code: `---
- name: Configure web servers
  hosts: web
  become: true
  serial: 2

  tasks:
    - name: Install Nginx
      ansible.builtin.package:
        name: nginx
        state: present

    - name: Install Nginx configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: "0644"
        validate: "nginx -t -c %s"
      notify: Reload Nginx

    - name: Ensure Nginx is running
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

  handlers:
    - name: Reload Nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded`,
      },
    ],
    tags: ['ansible', 'playbooks', 'nginx'],
  },
  {
    id: 'itv-mystpl-44',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'This Ansible task is named "Validate and enable Nginx". Does it actually validate the configuration?',
    probing: 'Whether you check what a module actually does instead of trusting a task name.',
    answer: [
      'A shorter version, often used to test whether a candidate actually understands what each module does rather than pattern-matching keywords:',
      '**The trap:** the task is named "Validate and enable Nginx", but the `service` module does **not** validate the Nginx configuration. It only starts and enables the service - if the config is broken, `service` will happily try to start (or fail to start) Nginx without ever checking `nginx -t`.',
      'Real validation has to come from somewhere else:',
      "- Run `nginx -t` explicitly as a separate task (e.g. via the `command` module), or\n- Use the `template` module's `validate` option (as in the fuller playbook above), which validates the rendered file before it's put in place.",
      "Interview takeaway: don't assume a task name describes what a module actually does - check what the module's documented behavior is.",
    ],
    code: [
      {
        title: 'Simpler Nginx playbook',
        language: 'yaml',
        code: `- name: Configure web servers
  hosts: webservers
  become: true
  serial: 1
  tasks:
    - name: Install Nginx
      ansible.builtin.package:
        name: nginx
        state: present

    - name: Validate and enable Nginx
      ansible.builtin.service:
        name: nginx
        enabled: true
        state: started`,
      },
    ],
    followUps: [
      'How would you add a safe rollback if the new config fails validation on one host?',
      'What does `serial: 1` protect you from here?',
    ],
    tags: ['ansible', 'nginx', 'validation'],
  },
]
