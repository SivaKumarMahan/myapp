import type { InterviewTopic } from '../../../types'
import { myNetworkingCloudQuestions } from './cloud'
import { myNetworkingContainerQuestions } from './containers'
import { myNetworkingFundamentalsQuestions } from './fundamentals'

export const myNetworkingTopic: InterviewTopic = {
  id: 'my-networking',
  group: 'bank',
  title: 'My networking questions',
  shortTitle: 'My networking',
  icon: '🌐',
  order: 114,
  oneLiner:
    'My own networking notes: tracing a request layer by layer across DNS, routing, firewalls, load balancers, TLS, Docker and Kubernetes, and AWS/Azure VPC and VNet design.',
  headlines: [
    'Trace the real request in layers: name resolution → route → firewall/ACL/NAT → TCP/UDP → TLS → proxy/load balancer → listener → application.',
    'A successful `ping` only proves an ICMP path works - it says nothing about DNS, the TCP port, TLS, authentication or application health.',
    'Stateful controls (security groups, NSGs) allow return traffic automatically; stateless ACLs need the ephemeral return ports too.',
    'A subnet is "public" because of its route to an Internet Gateway plus a public address - not because an IGW exists in the VPC. NAT gives outbound only.',
    'Kubernetes: `port` is the Service port, `targetPort` the container port, `nodePort` (30000-32767) the port on every node.',
    'NetworkPolicy only works if the CNI enforces it; start default-deny, then allow DNS and the flows you actually need.',
    'A 503 means no healthy backend or a failed upstream; a 504 means a proxy timed out. Find which layer generated it before changing anything.',
    'Tell `NXDOMAIN` (a real negative answer) apart from a timeout (a path or capacity problem), and test from the affected source network.',
  ],
  questions: [
    ...myNetworkingCloudQuestions,
    ...myNetworkingContainerQuestions,
    ...myNetworkingFundamentalsQuestions,
  ],
}
