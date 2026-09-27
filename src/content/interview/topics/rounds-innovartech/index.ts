import type { InterviewTopic } from '../../../types'
import { roundsInnovartechQuestions } from './questions'

export const roundsInnovartechTopic: InterviewTopic = {
  id: 'rounds-innovartech',
  group: 'rounds',
  title: 'InnovarTech rounds',
  shortTitle: 'InnovarTech',
  icon: '🏢',
  order: 205,
  oneLiner:
    'Questions from the InnovarTech round: a React and Spring Boot three-tier app, how the tiers connect, the multi-stage Dockerfiles, and the Azure DevOps flow to AKS.',
  headlines: [
    'React never talks to the database; it calls Spring Boot REST APIs over HTTPS, and the backend talks to the database.',
    'One Ingress routes / to the frontend and /api to the backend, so React can call relative paths like /api/users.',
    'Multi-stage builds: Node builds the React app and Nginx serves it; Maven builds the JAR and a slim JRE runs it.',
    'Check the build output folder: Create React App writes build/, Vite writes dist/.',
    'Pipeline: tests, SonarQube, Docker build, push to ACR tagged with the build ID, Helm deploy to AKS.',
  ],
  questions: [...roundsInnovartechQuestions],
}
