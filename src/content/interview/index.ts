import type { InterviewGroup, InterviewQuestion, InterviewTopic, InterviewTrack } from '../types'
import { azureFundamentalsTopic } from './topics/azure-fundamentals'
import { azureIdentityTopic } from './topics/azure-identity'
import { azureNetworkingTopic } from './topics/azure-networking'
import { azureComputeTopic } from './topics/azure-compute'
import { azureStorageTopic } from './topics/azure-storage'
import { azureDevopsTopic } from './topics/azure-devops'
import { azureIacTopic } from './topics/azure-iac'
import { azureMonitoringTopic } from './topics/azure-monitoring'
import { myAzureTopic } from './topics/my-azure'
import { myAzureDevopsTopic } from './topics/my-azure-devops'
import { myTerraformTopic } from './topics/my-terraform'
import { myKubernetesTopic } from './topics/my-kubernetes'
import { myHelmTopic } from './topics/my-helm'
import { myDockerTopic } from './topics/my-docker'
import { myJenkinsTopic } from './topics/my-jenkins'
import { myGitTopic } from './topics/my-git'
import { myArtifactsTopic } from './topics/my-artifacts'
import { myAnsibleTopic } from './topics/my-ansible'
import { myLinuxTopic } from './topics/my-linux'
import { myPythonTopic } from './topics/my-python'
import { myAwsTopic } from './topics/my-aws'
import { myNetworkingTopic } from './topics/my-networking'
import { myMonitoringTopic } from './topics/my-monitoring'
import { myOpsTopic } from './topics/my-ops'
import { myCheatsheetsTopic } from './topics/my-cheatsheets'
import { myFrequentTopic } from './topics/my-frequent'
import { myStudyScenariosTopic } from './topics/my-study-scenarios'
import { myStudyPlatformTopic } from './topics/my-study-platform'
import { myAiTopic } from './topics/my-ai'
import { myGeneralTopic } from './topics/my-general'
import { roundsDeloitteTopic } from './topics/rounds-deloitte'
import { roundsManagerialTopic } from './topics/rounds-managerial'
import { roundsAtcTopic } from './topics/rounds-atc'
import { roundsSimcorpTopic } from './topics/rounds-simcorp'
import { roundsInnovartechTopic } from './topics/rounds-innovartech'
import { dockerTopic } from './topics/docker'
import { kubernetesTopic } from './topics/kubernetes'
import { jenkinsTopic } from './topics/jenkins'
import { githubActionsTopic } from './topics/github-actions'
import { awsTopic } from './topics/aws'
import { terraformTopic } from './topics/terraform'
import { prometheusTopic } from './topics/prometheus'
import { grafanaTopic } from './topics/grafana'
import { ansibleTopic } from './topics/ansible'
import { splunkTopic } from './topics/splunk'
import { pythonTopic } from './topics/python'
import { shellTopic } from './topics/shell'
import { linuxTopic } from './topics/linux'

/**
 * Azure and DevOps interview preparation.
 *
 * Separate from the certification courses on purpose: a course teaches a
 * syllabus, this rehearses answers. The unit of study here is a single
 * question you can answer out loud, not a lesson you work through.
 */
export const interviewTopics: InterviewTopic[] = [
  azureFundamentalsTopic,
  azureIdentityTopic,
  azureNetworkingTopic,
  azureComputeTopic,
  azureStorageTopic,
  azureDevopsTopic,
  azureIacTopic,
  azureMonitoringTopic,
  dockerTopic,
  myAzureTopic,
  myAzureDevopsTopic,
  myTerraformTopic,
  myKubernetesTopic,
  myHelmTopic,
  myDockerTopic,
  myJenkinsTopic,
  myGitTopic,
  myArtifactsTopic,
  myAnsibleTopic,
  myLinuxTopic,
  myPythonTopic,
  myAwsTopic,
  myNetworkingTopic,
  myMonitoringTopic,
  myOpsTopic,
  myCheatsheetsTopic,
  myFrequentTopic,
  myStudyScenariosTopic,
  myStudyPlatformTopic,
  myAiTopic,
  myGeneralTopic,
  roundsDeloitteTopic,
  roundsManagerialTopic,
  roundsAtcTopic,
  roundsSimcorpTopic,
  roundsInnovartechTopic,
  kubernetesTopic,
  jenkinsTopic,
  githubActionsTopic,
  awsTopic,
  terraformTopic,
  prometheusTopic,
  grafanaTopic,
  ansibleTopic,
  splunkTopic,
  pythonTopic,
  shellTopic,
  linuxTopic,
].sort((a, b) => a.order - b.order)

export const interviewTrack: InterviewTrack = {
  id: 'interview',
  title: 'Azure & DevOps interview preparation',
  subtitle:
    'Questions a real interviewer asks, from first-round basics to senior scenario rounds - with the answer, the trap, and what they will ask next.',
  route: '/interview',
  topics: interviewTopics,
}

/** The hub sections, in the order they are listed. */
export const interviewGroups: { id: InterviewGroup; title: string; description: string }[] = [
  {
    id: 'bank',
    title: 'My question bank',
    description: 'Your own questions and answers, imported from your interview notes.',
  },
  {
    id: 'rounds',
    title: 'Real interview rounds',
    description: 'Questions recalled from actual interview rounds, grouped by company.',
  },
  {
    id: 'azure',
    title: 'Azure topics',
    description: 'Azure interview questions written for this app.',
  },
  {
    id: 'devops',
    title: 'DevOps topics',
    description: 'General DevOps interview questions written for this app.',
  },
]

export function groupOf(topic: InterviewTopic): InterviewGroup {
  return topic.group ?? (topic.id.startsWith('azure-') ? 'azure' : 'devops')
}

export const interviewTopicById = new Map(interviewTopics.map((topic) => [topic.id, topic]))

/** Every question across every topic, with its topic attached. */
export const allInterviewQuestions: { topic: InterviewTopic; question: InterviewQuestion }[] =
  interviewTopics.flatMap((topic) => topic.questions.map((question) => ({ topic, question })))

export const interviewQuestionById = new Map(
  allInterviewQuestions.map((entry) => [entry.question.id, entry]),
)
