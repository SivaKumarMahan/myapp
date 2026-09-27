import type { InterviewQuestion } from '../../../types'

/** SimCorp round: application stack and RCA questions. */
export const roundsSimcorpProjectQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rsim-23',
    level: 'basic',
    kind: 'open',
    prompt:
      'What types of applications are used in the frontend and backend? (Frontend: React.js, Backend: Java Spring Boot)',
    probing:
      'Whether you can describe the application stack you operate and how requests flow through it to the database.',
    answer: [
      '**Sample answer:** "In our application, we used **React.js for the frontend** and **Java Spring Boot for the backend**.',
      'React.js is used to build the user interface that users interact with through the browser. It communicates with the backend through **REST APIs**.',
      'The Spring Boot backend contains the **business logic** and exposes REST APIs. It handles authentication, request processing, database operations, and communication with other services.',
      'Our backend services communicate with the **PostgreSQL** database for storing and retrieving application data.',
      'We containerized both frontend and backend applications using **Docker** and deployed them as **separate workloads in AKS**."',
      '**Technologies you can mention**',
      '- **Frontend**: Technology: React.js; Purpose: User interface\n- **Backend**: Technology: Java Spring Boot; Purpose: REST APIs and business logic\n- **Database**: Technology: PostgreSQL; Purpose: Application data\n- **Container**: Technology: Docker; Purpose: Package applications\n- **Orchestration**: Technology: Kubernetes / AKS; Purpose: Run and manage containers\n- **API**: Technology: REST; Purpose: Frontend-backend communication\n- **Build**: Technology: Maven; Purpose: Build Java application\n- **CI/CD**: Technology: Azure DevOps; Purpose: Build, test and deployment\n- **Container Registry**: Technology: Azure Container Registry; Purpose: Store Docker images\n- **Ingress**: Technology: Application Gateway / Ingress; Purpose: Route external traffic',
      '**If they ask: "How does a user request flow through your application?"**',
      '"The user accesses the application through the browser. The request reaches the frontend, which is hosted in our AKS environment. When the frontend needs data, it makes a **REST API call** to the Spring Boot backend. The backend processes the request and communicates with PostgreSQL or another required microservice. The response is then returned to the frontend and displayed to the user."',
      "This answer works well for a DevOps Engineer interview because it connects the application stack directly to the Kubernetes and Azure infrastructure you're expected to manage.",
    ],
    followUps: ['How does a user request flow through your application?'],
    code: [
      {
        title: 'Overall architecture',
        language: 'text',
        code: `                    End User
                       |
                       ↓
                  Web Browser
                       |
                       ↓
                  React.js
                 Frontend
                       |
                  REST API
                       ↓
              Java Spring Boot
                  Backend
                       |
              ┌────────┴────────┐
              ↓                 ↓
        PostgreSQL         Other APIs/
          Database         Microservices`,
      },
      {
        title: 'User request flow',
        language: 'text',
        code: `User
 ↓
Application Gateway / Ingress
 ↓
React.js Pod
 ↓
Spring Boot API
 ↓
PostgreSQL
 ↓
Spring Boot
 ↓
React.js
 ↓
User`,
      },
    ],
    tags: ['react', 'spring boot', 'architecture', 'aks'],
  },
  {
    id: 'itv-rsim-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Did you provide RCA to clients?',
    probing:
      'A specific incident with a clear RCA structure, and communicating it to a client without unnecessary jargon.',
    answer: [
      'For an interview, answer with a **specific incident** and a clear **RCA structure**.',
      '**Sample answer:** "Yes, whenever we had a significant production incident that impacted the client, we prepared and shared an **RCA**.',
      'For example, we had an incident where application pods were getting **OOMKilled** because their memory usage was continuously increasing. We first mitigated the issue by increasing replicas and ensuring the application remained available. Then we analyzed the pod metrics, logs, and application behavior and identified a **memory leak** in the application.',
      'We documented the incident with the **impact, timeline, root cause, immediate resolution, permanent fix, and preventive actions**. After the development team fixed the memory leak, we deployed the new version and monitored the pods to confirm that memory usage was stable.',
      'We then shared the RCA with the client and discussed the preventive actions with them." Example',
      '- **Incident**: Application pods restarted\n- **Impact**: Some requests were affected\n- **Detection**: Memory alert + pod restart\n- **Immediate action**: Increased replicas / stabilized workload\n- **Root cause**: Application memory leak\n- **Permanent fix**: Code fix + new application version\n- **Validation**: Memory usage remained stable\n- **Prevention**: Memory alerts and resource review',
      '**If they ask: "How did you communicate the RCA to the client?"**',
      '"We first validated the technical root cause internally. Then we prepared a clear RCA **without unnecessary technical jargon**, explained the business impact, what caused the issue, what we did to resolve it, and what actions we were taking to prevent recurrence. We reviewed it with the client in a meeting or shared the documented RCA through the agreed communication channel."',
    ],
    followUps: ['How did you communicate the RCA to the client?'],
    code: [
      {
        title: 'Typical RCA format',
        language: 'text',
        code: `1. Incident Summary
2. Business / Application Impact
3. Incident Timeline
4. Detection
5. Immediate Mitigation
6. Root Cause
7. Permanent Resolution
8. Preventive / Corrective Actions
9. Monitoring Improvements`,
      },
    ],
    tags: ['rca', 'incident', 'communication'],
  },
]
