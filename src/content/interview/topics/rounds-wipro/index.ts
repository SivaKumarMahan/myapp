import type { InterviewTopic } from '../../../types'
import { roundsWiproQuestions } from './questions'

export const roundsWiproTopic: InterviewTopic = {
  id: 'rounds-wipro',
  group: 'rounds',
  title: 'Wipro rounds',
  shortTitle: 'Wipro',
  icon: '🏢',
  order: 210,
  oneLiner:
    'Questions from the Wipro round: umask, AKS authentication, Services and Pod IPs, etcd and kubelet failures, scheduling and NotReady troubleshooting, Docker, Helm and Jenkins.',
  headlines: [
    'umask removes permissions from 666 (files) and 777 (directories): umask 022 gives 644 and 755.',
    'AKS access: az login, az aks get-credentials, kubectl. Entra ID authenticates; Azure RBAC or Kubernetes RBAC authorizes.',
    'Pod IPs are dynamic; a Service is the stable endpoint. A headless Service (clusterIP: None) returns Pod IPs for StatefulSets.',
    'etcd down: running Pods keep running, but state reads and writes fail. kubelet down: the node goes NotReady and Pods are rescheduled.',
    'Pending Pod or NotReady Pod: start with kubectl describe pod and the Events. NotReady node: describe node, then kubelet, containerd and pressure.',
    'A changed Secret never updates env vars; mounted volumes update after a delay, but the app must re-read the file.',
    'Jenkins: secrets live in Credentials or Key Vault, never the Jenkinsfile; a restore needs JENKINS_HOME including secrets/ and compatible plugins.',
  ],
  questions: roundsWiproQuestions,
}
