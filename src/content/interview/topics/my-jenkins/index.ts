import type { InterviewTopic } from '../../../types'
import { myJenkinsQuestions } from './jenkins'
import { myJenkinsScenarioQuestions } from './jenkins-scenarios'
import { myTestingQuestions } from './testing'

export const myJenkinsTopic: InterviewTopic = {
  id: 'my-jenkins',
  group: 'bank',
  title: 'My Jenkins & testing questions',
  shortTitle: 'My Jenkins',
  icon: '🔧',
  order: 107,
  oneLiner:
    'My Jenkins and testing notes: controller and agents, Jenkinsfiles and shared libraries, approvals, HA and DR, troubleshooting, plus SonarQube, Trivy, Checkov and pipeline security testing.',
  headlines: [
    'The controller schedules and stores config; agents run the builds. Never build on the controller - use labelled, ephemeral agents.',
    "Keep the Jenkinsfile in the app repo and common logic in a shared library pinned with `@Library('lib@v3') _`.",
    'Jenkins controllers run active/passive: recovery means tested `JENKINS_HOME` backups plus Configuration as Code, not replicas on shared storage.',
    'Gate order: tests, SonarQube, `waitForQualityGate abortPipeline: true`, image build, Trivy with `--exit-code 1`, then publish. Slack only reports.',
    'Use `input` with `submitter` and a timeout only after the automated gates pass; production credentials come after approval.',
    'A job stuck waiting for an executor is usually labels, offline agents or capacity - fix the agent pool, not controller executors.',
    'Checkov suppressions need a check ID, reason, owner and expiry; a suppression is an accepted risk, not a fix.',
  ],
  questions: [...myJenkinsQuestions, ...myJenkinsScenarioQuestions, ...myTestingQuestions],
}
