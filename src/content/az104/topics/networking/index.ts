import type { Topic } from '../../../types'
import { vnetsPeering } from './vnets-peering'
import { routingPublicIp } from './routing-public-ip'
import { nsgBastion } from './nsg-bastion'
import { privateEndpoints } from './private-endpoints'
import { dnsLoadBalancing } from './dns-load-balancing'

/** Lessons in this domain, in teaching order. */
export const az104NetworkingTopics: Topic[] = [
  vnetsPeering,
  routingPublicIp,
  nsgBastion,
  privateEndpoints,
  dnsLoadBalancing,
]
