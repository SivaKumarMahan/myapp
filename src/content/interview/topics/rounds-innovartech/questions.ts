import type { InterviewQuestion } from '../../../types'

/** InnovarTech round: three-tier app, Dockerfiles and the AKS delivery flow. */
export const roundsInnovartechQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rinv-1',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Which application have you used in frontend and backend? How is frontend connected to backend? Write the Dockerfile you used in the project.',
    probing:
      'Whether you can describe a real three-tier application end to end and tie the app stack to the containers, AKS and pipeline you ran.',
    answer: [
      'For an Azure DevOps Engineer interview, explain it as a real 3-tier application: React.js frontend + Java Spring Boot backend + database, then explain how you containerized it and deployed it to AKS.',
      'You can answer: "In one of my projects, we had a React.js frontend and Java Spring Boot microservices as the backend. The frontend was responsible for the user interface, while the backend exposed REST APIs for business operations. We used a database such as PostgreSQL or Azure SQL depending on the service. The applications were containerized using Docker and deployed to AKS. Azure DevOps was used for CI/CD, ACR for storing Docker images, Helm for Kubernetes deployments, and Azure Monitor / Application Insights for monitoring."',
      '**Interview answer:** "In my project, the frontend was developed using React.js and the backend consisted of Java Spring Boot REST APIs. The React application communicates with the backend through HTTPS REST API calls. The frontend doesn\'t directly access the database. The backend handles business logic and communicates with the database.',
      'We containerized both applications separately. For React, I used a multi-stage Dockerfile where Node.js was used to build the application and Nginx was used as the lightweight runtime server. For the Spring Boot backend, I used Maven to build the JAR in the first stage and a lightweight JRE image in the second stage.',
      'In Kubernetes, we deployed frontend and backend as separate deployments and services. Ingress routed normal application traffic to the frontend and `/api` requests to the backend. In Azure DevOps, the pipeline built and tested the applications, ran SonarQube analysis, built Docker images, pushed them to ACR, and deployed them to AKS using Helm."',
    ],
    followUps: [
      'How does the React frontend call the backend without hardcoding service names?',
      'Why did you use multi-stage Dockerfiles?',
    ],
    code: [
      {
        title: 'Architecture',
        language: 'text',
        code: `                    Users
                      |
                      v
               Azure Application Gateway
                      |
                   Ingress
                      |
          +-----------+-----------+
          |                       |
          v                       v
   React Frontend          Spring Boot APIs
   Nginx Container         Backend Containers
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
                Database                  Other APIs`,
      },
    ],
    tags: ['3-tier', 'aks', 'docker', 'project'],
  },
  {
    id: 'itv-rinv-2',
    level: 'basic',
    kind: 'open',
    prompt: 'How does the React frontend connect to the backend?',
    probing:
      'That you know the browser calls REST APIs on the backend, and the database is only ever reached by the backend.',
    answer: [
      'The important point is:',
      '**React does not directly connect to the database.**',
      'React calls backend REST APIs over HTTP / HTTPS.',
      'For example, React might call: `GET https://myapp.com/api/users`',
      'The backend then talks to the database.',
    ],
    code: [
      {
        title: 'The backend receives the request',
        language: 'text',
        code: `React
  |
  | HTTPS REST API
  v
Spring Boot
  |
  v
Database`,
      },
      {
        title: 'For example, in React',
        language: 'text',
        code: `const response = await fetch("/api/users");

const users = await response.json();`,
      },
      {
        title: 'The backend exposes',
        language: 'text',
        code: `@GetMapping("/api/users")
public List<User> getUsers() {
    return userService.getUsers();
}`,
      },
    ],
    tags: ['react', 'spring boot', 'rest api'],
  },
  {
    id: 'itv-rinv-3',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you connect the frontend and backend in Kubernetes?',
    probing:
      'Whether you use one Ingress with path-based routing so the frontend can call relative /api paths.',
    answer: [
      'I would normally expose them through an Ingress.',
      'This is useful because the React application can simply call:',
    ],
    code: [
      {
        title: 'For example',
        language: 'text',
        code: `https://myapp.com/
        |
        v
    Ingress
    /      \\
   /        \\
  v          v
React      Backend
           /api/*`,
      },
      {
        title: 'Ingress rules can route',
        language: 'text',
        code: `myapp.com/       -> frontend-service
myapp.com/api/*  -> backend-service`,
      },
      {
        title: 'Flow',
        language: 'text',
        code: `fetch("/api/users")`,
      },
      {
        title: 'instead of hardcoding',
        language: 'text',
        code: `fetch("http://backend-service:8080/api/users")`,
      },
    ],
    tags: ['ingress', 'kubernetes', 'routing'],
  },
  {
    id: 'itv-rinv-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write the Dockerfile you used for the React frontend.',
    probing:
      'Can you write a multi-stage build from memory: Node to build, Nginx to serve, and know where the build output lands.',
    answer: [
      'For React, I would use a multi-stage Docker build.',
      'The exact output directory depends on the React setup. For example, some setups generate `build/`, while Vite normally generates `dist/`.',
    ],
    code: [
      {
        title: 'React Dockerfile',
        language: 'dockerfile',
        code: `# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# Runtime stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]`,
      },
      {
        title: 'For Vite',
        language: 'dockerfile',
        code: `COPY --from=builder /app/dist /usr/share/nginx/html`,
      },
    ],
    tags: ['dockerfile', 'react', 'multi-stage'],
  },
  {
    id: 'itv-rinv-5',
    level: 'basic',
    kind: 'open',
    prompt: 'Why do you use a multi-stage Dockerfile?',
    probing:
      'That you understand build-time tooling should not ship in the runtime image, and why that matters for size.',
    answer: [
      'The first stage contains:',
      '- Node.js\n- npm\n- source code\n- dependencies\n- build tools',
      'These are not needed at runtime.',
      'The final image contains only:',
      '- Nginx\n- React static files',
      'So the production image is much smaller.',
    ],
    code: [
      {
        title: 'Flow',
        language: 'text',
        code: `Stage 1
Node
  |
  +-- npm install
  +-- npm build
  |
  v
React build files
  |
  v
Stage 2
Nginx
  |
  +-- React files
  |
  v
Production container`,
      },
    ],
    tags: ['dockerfile', 'multi-stage', 'image size'],
  },
  {
    id: 'itv-rinv-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Write the Dockerfile you used for the Java Spring Boot backend.',
    probing:
      'Can you build the JAR with Maven in one stage and run it on a slim JRE image in the next.',
    answer: [
      'If the backend is Java Spring Boot, a typical Dockerfile would be:',
      'Again, the exact Java version depends on the project.',
    ],
    code: [
      {
        title: 'Example',
        language: 'dockerfile',
        code: `# Build stage
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

COPY pom.xml .

RUN mvn dependency:go-offline

COPY src ./src

RUN mvn clean package -DskipTests


# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]`,
      },
    ],
    tags: ['dockerfile', 'spring boot', 'maven'],
  },
  {
    id: 'itv-rinv-7',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Walk through the Azure DevOps CI/CD flow that builds and deploys the frontend and backend to AKS.',
    probing:
      'Whether you can connect the application build to your DevOps role: tests, quality gate, image build, ACR, Helm and AKS in order.',
    answer: [
      'This is where you should connect the answer to your DevOps role.',
      'The flow: a developer pushes to Azure Repos / Git; the Azure DevOps pipeline runs the React npm install, tests and build, SonarQube, and the Docker build; the images are pushed to Azure Container Registry as `myfrontend:BuildId` and `mybackend:BuildId`; a Helm deployment rolls them out to AKS as a frontend Pod and backend Pods, and the backend Pods talk to the database.',
    ],
    followUps: [
      'How do you tag images so the same build can be promoted across environments?',
      'Where would you add image scanning and approvals in this flow?',
    ],
    code: [
      {
        title: 'Azure DevOps CI/CD flow',
        language: 'text',
        code: `Developer
    |
    v
Azure Repos / Git
    |
    v
Azure DevOps Pipeline
    |
    +--> React npm install
    +--> React tests
    +--> React build
    +--> SonarQube
    |
    +--> Docker build
    +--> Docker image
    |
    v
Azure Container Registry
    |
    | myfrontend:BuildId
    | mybackend:BuildId
    |
    v
Helm Deployment
    |
    v
AKS
    |
    +--> Frontend Pod
    |
    +--> Backend Pods
             |
             v
          Database`,
      },
    ],
    tags: ['azure devops', 'ci/cd', 'helm', 'aks'],
  },
]
