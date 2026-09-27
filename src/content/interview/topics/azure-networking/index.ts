import type { InterviewTopic } from '../../../types'
import { azureNetworkingFundamentalsQuestions } from './fundamentals'
import { azureNetworkingRoutingQuestions } from './routing'
import { azureNetworkingPrivateQuestions } from './private'
import { azureNetworkingLoadBalancingQuestions } from './loadbalancing'

export const azureNetworkingTopic: InterviewTopic = {
  id: 'azure-networking',
  title: 'Azure networking',
  shortTitle: 'Networking',
  icon: '🌐',
  order: 3,
  oneLiner:
    'Address planning, hub-spoke and Virtual WAN, UDRs and firewalls, SNAT, private endpoints and DNS, hybrid links and choosing the right load balancer.',
  headlines: [
    'Azure reserves **five** IPs in every subnet. Never overlap with on-premises or anything you might peer with.',
    'Peering is **non-transitive**. Spoke-to-spoke goes through the hub firewall via UDRs - and the GatewaySubnet needs routes too, or the return path is asymmetric.',
    'NSGs: lowest priority number wins, stateful, and subnet and NIC NSGs must **both** allow the traffic.',
    'SNAT exhaustion looks like intermittent outbound timeouts under load. Reuse connections first, then NAT gateway, then private endpoints.',
    'A private endpoint is a private IP for **one** resource. It does nothing until DNS resolves the name to it, and it does not disable public access on its own.',
    'Private DNS: central privatelink zones linked to every VNet; on-premises forwards to a DNS Private Resolver inbound endpoint, because 168.63.129.16 is only reachable inside Azure.',
    'ExpressRoute is private but **not encrypted** by default. Real resilience means two peering locations.',
    'Layer 4 vs 7, regional vs global: Load Balancer, Application Gateway, Front Door, Traffic Manager (DNS only).',
  ],
  questions: [
    ...azureNetworkingFundamentalsQuestions,
    ...azureNetworkingRoutingQuestions,
    ...azureNetworkingPrivateQuestions,
    ...azureNetworkingLoadBalancingQuestions,
  ],
}
