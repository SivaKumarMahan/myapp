import type { InterviewQuestion } from '../../../types'

/** AWS VPC, Azure VNet, multi-cloud and Terraform networking. */
export const myNetworkingCloudQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mynet-1',
    level: 'advanced',
    kind: 'open',
    prompt:
      'Design a production AWS VPC with subnets and security groups, and explain the networking.',
    probing:
      'Whether you can lay out a multi-AZ, three-tier VPC with correct routing and security-group chaining, not just name the components.',
    answer: [
      'This is the layout I design for production:',
      "- **VPC** with a planned CIDR (e.g. `10.0.0.0/16`), spanning **at least 2 AZs** for high availability.\n- **Subnets per AZ:** public (ALB/NAT), private-app (compute), private-data (RDS) — a 3-tier layout.\n- **Routing:** public subnets route to the Internet Gateway; private subnets route to a **NAT Gateway** for outbound-only access (one per AZ, for HA). DB subnets get no internet route at all.\n- **Security groups (stateful, per-instance):** the ALB's security group allows port 443 from the internet; the app's security group allows traffic **from the ALB's security group**; the DB's security group allows port 5432 **from the app's security group**. Reference other security groups, not raw CIDR ranges.\n- **NACLs (stateless, per-subnet):** a coarser allow/deny layer on top of security groups.\n- **Add-ons:** VPC endpoints (S3/ECR) to keep that traffic off the public internet, flow logs for auditing, and multi-AZ everywhere.",
      '**AWS network security**',
      '- **Networking:** private subnets for workloads, tight security groups that reference other security groups, NACLs, VPC endpoints, WAF and Shield at the edge, encryption in transit (TLS) and at rest (KMS), and flow logs plus GuardDuty and CloudTrail for detecting problems.',
    ],
    followUps: [
      'How would you connect this VPC to on-premises or to other VPCs?',
      'Why reference security groups instead of CIDR ranges?',
    ],
    tags: ['aws', 'vpc', 'security groups', 'design'],
  },
  {
    id: 'itv-mynet-2',
    level: 'intermediate',
    kind: 'open',
    prompt: 'AWS Application Load Balancer vs Network Load Balancer: when do you pick each?',
    probing:
      'Whether you understand the Layer 7 vs Layer 4 difference and the practical reasons (protocols, static IPs, source IP) that drive the choice.',
    answer: [
      'An Application Load Balancer works at Layer 7, for HTTP/HTTPS. It understands hosts, paths, headers, methods, redirects, and WebSockets, checks target health, and can integrate with WAF and authentication.',
      'I pick it for web applications, APIs, ingress-style routing, and cases where several services sit behind one endpoint.',
      "A Network Load Balancer works at Layer 4, for TCP, TLS, and UDP. It's built for very high throughput and low latency, preserves the client's source IP in supported modes, and gives you static IP addresses or Elastic IPs.",
      'I pick it for non-HTTP protocols, when clients need a fixed IP to allow-list, or when a workload specifically needs Layer-4 behavior.',
      'Other things that factor into the choice: where TLS terminates, target type, cross-zone load balancing and its cost, health checks, idle connection timeouts, whether clients need to see the real source IP, security groups, whether the load balancer is internal or internet-facing, logging/metrics, and how it behaves if a zone fails.',
      "To troubleshoot, I trace the path in order: DNS → listener → rule → target group → target health and port → security group/NACL/route → application response. A healthy load-balancer resource doesn't mean the application behind it is actually reachable.",
    ],
    tags: ['aws', 'load balancer', 'alb', 'nlb'],
  },
  {
    id: 'itv-mynet-3',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you connect to an EC2 instance?',
    probing:
      'Whether you know the secure ways to reach an instance and can debug a failed SSH connection methodically.',
    answer: [
      'My preferred way is over the private IP, through a VPN or bastion, or with AWS Systems Manager Session Manager — I avoid public SSH when I can. If SSH is approved:',
      'The username depends on the AMI. The network path needs a route, and the security group/NACL/firewall needs to allow port 22, with `sshd` running on the instance. I check the host key, never share the private key, and use short-lived, certificate-based, or SSM access wherever possible.',
      "**Failure steps:** check DNS/IP, run `nc -vz host 22`, check the security group/NACL/route, confirm the instance and `sshd` are up (via SSM or the console), run `ssh -vvv` for verbose output, and check user/key/`authorized_keys` permissions and the auth logs. I don't open `0.0.0.0/0` as a shortcut.",
    ],
    code: [
      {
        title: 'SSH with a key file',
        language: 'bash',
        code: `chmod 600 key.pem
ssh -i key.pem -o IdentitiesOnly=yes ec2-user@host`,
      },
    ],
    tags: ['aws', 'ec2', 'ssh'],
  },
  {
    id: 'itv-mynet-4',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the main components of an AWS VPC?',
    probing:
      'Whether you know the building blocks of a VPC and what actually makes a subnet public.',
    answer: [
      'A VPC is an isolated network with one or more non-overlapping CIDR blocks. Subnets divide it up by availability zone and purpose.',
      'Route tables decide the next hop for traffic. An Internet Gateway provides a path for public IPv4/IPv6 traffic. A NAT Gateway gives private subnets IPv4 outbound access. An egress-only Internet Gateway handles outbound-only IPv6. Security groups are stateful controls on network interfaces, while network ACLs are stateless controls at the subnet level.',
      'Real-world designs also need DNS settings and Route 53 private zones, Elastic Network Interfaces and addresses, VPC endpoints/PrivateLink, load balancers, flow logs, DHCP options, and connectivity through peering, Transit Gateway, VPN, or Direct Connect.',
      'A subnet is "public" because its route table sends traffic to an Internet Gateway and the resource in it has a public address — not simply because an Internet Gateway happens to exist somewhere in the VPC.',
      "For high availability, I use multiple AZs, keep public and private subnets independent, apply least-privilege routing and security (giving only the access that's needed), control egress, turn on flow logs, and plan IP capacity ahead of time. I test both the forward and return paths, and avoid overlapping CIDRs that would block future connectivity.",
    ],
    tags: ['aws', 'vpc'],
  },
  {
    id: 'itv-mynet-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you access an EC2 instance in a private subnet?',
    probing:
      'Whether you reach for Session Manager or a controlled bastion instead of exposing SSH publicly.',
    answer: [
      "My preferred option is AWS Systems Manager Session Manager, using an instance profile and either private SSM VPC endpoints or controlled egress. It avoids inbound SSH entirely, gives IAM/MFA control and audit logs, and doesn't require distributing private keys.",
      "Where SSH is genuinely required, I connect through a corporate VPN/Direct Connect or an approved hardened bastion, using `ProxyJump`. The private instance's security group only allows port 22 from the bastion's security group or a specific admin CIDR.",
      "I check the instance is healthy, the route and return path exist, NACLs allow the flow and the ephemeral return ports, the security group is correct, DNS resolves privately, and `sshd`/the host firewall and the user's key are valid. EC2 Instance Connect Endpoint is another controlled option where it's supported.",
      'I never assign a public IP or open SSH to `0.0.0.0/0` just to troubleshoot. Access should be time-bound, least-privilege, logged, and removed once the issue is resolved.',
    ],
    tags: ['aws', 'ec2', 'ssm', 'bastion'],
  },
  {
    id: 'itv-mynet-6',
    level: 'intermediate',
    kind: 'open',
    prompt: "Why can't you attach an Internet Gateway directly to a public subnet?",
    probing:
      'Whether you understand that an Internet Gateway is VPC-level and public reachability comes from routes plus addresses.',
    answer: [
      'An Internet Gateway attaches to the VPC as a whole, not to an individual subnet. A subnet becomes "public" when its route table sends internet-bound traffic (like `0.0.0.0/0`) to that Internet Gateway, and an instance or load balancer in it has a public IPv4/Elastic IP or the right IPv6 address.',
      'Security groups and network ACLs still need to allow the traffic too.',
      'This matters because several public subnets across different availability zones can all share the same VPC-level attachment while each has its own separate route-table association.',
      "A route by itself doesn't translate a private IPv4 address into a public one. And an Internet Gateway doesn't create unsolicited access on its own — if the resource has no public address, or its security rules deny the traffic, the traffic still won't get through.",
    ],
    tags: ['aws', 'vpc', 'internet gateway'],
  },
  {
    id: 'itv-mynet-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can a server in a private subnet access the internet securely?',
    probing:
      'Whether you know NAT Gateway placement per AZ, VPC endpoints, and egress control for private workloads.',
    answer: [
      "For IPv4, the private subnet's route table normally sends `0.0.0.0/0` to a NAT Gateway sitting in a public subnet, and that public subnet in turn routes to the Internet Gateway.",
      "I deploy a NAT Gateway per AZ, both for availability and to avoid cross-AZ traffic and its extra cost, and I check the server's security group, NACLs, DNS, the return path, and the NAT Gateway's health.",
      'A self-managed NAT instance is possible, but it needs its own HA design, patching, packet forwarding, and source/destination-check setup.',
      'For talking to other AWS services, I prefer gateway or interface VPC endpoints, so that traffic never has to cross the public internet or go through NAT at all. An egress firewall or proxy, DNS policy, allow-lists, TLS validation, flow logs, and least-privilege endpoint policies all help limit where traffic can actually go.',
      'IPv6 uses an egress-only Internet Gateway for outbound-initiated access.',
      'When troubleshooting, I test DNS, `ip route`, TCP/TLS, NAT Gateway metrics, route table associations, flow logs, and the actual response from the destination — testing from the affected subnet itself, not just from a public bastion.',
    ],
    tags: ['aws', 'nat gateway', 'vpc endpoints'],
  },
  {
    id: 'itv-mynet-8',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between an Internet Gateway and a NAT Gateway?',
    probing:
      'Whether you know which direction each gateway allows traffic and what else must be true for connectivity to work.',
    answer: [
      'An **Internet Gateway (IGW)** attaches to a VPC and gives it a route target for internet traffic. A resource in a public subnet is only actually reachable from the internet if routing, a public IPv4/IPv6 address, security groups, network ACLs, and the service itself all allow it.',
      'Typical public endpoints are internet-facing load balancers and deliberately exposed bastion hosts.',
      'A **NAT Gateway** does source NAT for outbound IPv4 connections from private subnets. Private instances route their internet-bound traffic to the NAT Gateway, which reaches the internet through an IGW.',
      'It does not accept unsolicited inbound connections back to those private instances. Design NAT Gateway placement and routing per Availability Zone, so you avoid depending on another AZ and paying its cross-AZ cost.',
      "Use **VPC endpoints** for supported AWS services when private access, tighter policy control, availability, or avoiding NAT cost makes it worthwhile. When troubleshooting, check the subnet route table, the NAT/IGW association, whether the address is public or private, the security group, the stateless network ACL's return ports, DNS resolution, and flow logs.",
      "Having an IGW or NAT resource in place doesn't by itself prove that end-to-end connectivity actually works.",
    ],
    code: [
      {
        title: 'Public vs private traffic paths',
        language: 'text',
        code: `Public workload: public subnet route -> IGW -> internet
Private egress:  private subnet route -> NAT Gateway -> IGW -> internet`,
      },
    ],
    tags: ['aws', 'internet gateway', 'nat gateway'],
  },
  {
    id: 'itv-mynet-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure Virtual Network?',
    probing:
      'Whether you can explain a VNet and its connectivity options and know that peering is not transitive.',
    answer: [
      'A VNet is an isolated network in Azure, with its own address space and subnets. Resources inside it talk to each other and to the outside world through routes, NSGs, peering, gateways, private endpoints, load balancers, and DNS.',
      "I plan non-overlapping address ranges with room to grow, keep workload and security tiers separate, control routing and egress, and connect on-premises networks through VPN or ExpressRoute. Peering gives connectivity between two VNets, but it isn't transitive by default — a third VNet peered to one of them isn't automatically reachable.",
      "When something's broken, I check DNS, effective routes, effective NSG rules, any firewall/NVA, peering/gateway status, service firewalls, and the application port. Network Watcher's connection troubleshoot tool and flow logs help pinpoint exactly where traffic is being dropped.",
      'After any IaC change, I confirm both the traffic that should get through and the traffic that should be blocked behave as expected.',
      '**VNet, Subnet, and Application Delivery Patterns**',
      'An Azure VNet is a private address space and routing boundary. Subnets divide it up by trust zone or role — for example ingress, web, application, data, private endpoints, and management.',
      'Plan non-overlapping address ranges with room to grow, then attach resources through network interfaces or private integration.',
      'NSGs filter traffic by source, destination, protocol, and port at the subnet or NIC level. User-defined routes control where traffic goes. Peering connects VNets to each other. A VPN Gateway or ExpressRoute handles hybrid connectivity. Private endpoints give supported PaaS services their own private addresses, which needs matching private DNS design.',
      'Don\'t call an Azure subnet inherently "public" or "private" — how exposed it actually is depends on public IPs, load-balancer or application-gateway frontends, routes, NAT, NSGs, firewall policy, and the service running there.',
    ],
    tags: ['azure', 'vnet'],
  },
  {
    id: 'itv-mynet-10',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Azure Application Gateway?',
    probing:
      'Whether you know the listener/rule/backend flow of Application Gateway and how to debug a 502/503.',
    answer: [
      'Application Gateway is a regional Layer-7 load balancer for HTTP/HTTPS. It handles host/path routing, TLS termination (or end-to-end TLS), health probes, session affinity, redirects, autoscaling, and can add a Web Application Firewall.',
      '**Flow:** client → frontend IP/listener → routing rule → backend pool/HTTP setting → healthy backend. WAF policies inspect requests using managed or custom rules.',
      "For a 502/503, I check the backend's health-check failure reason, DNS/IP, probe path/status, host header, certificate trust, port/protocol, NSG/routes, and whether the backend is actually ready. I compare access, performance, and firewall logs to narrow it down.",
      "Once fixed, I test TLS, the routing paths, health checks, and latency, and confirm WAF is still doing its job — I don't disable protection broadly just to get things working again.",
      '**Azure Application Gateway request flow**',
      "Application Gateway is a regional Layer-7 load balancer for HTTP/HTTPS. Listeners receive traffic, rules pick a backend by host or path, backend settings define the protocol, port, TLS, and session behavior, and health probes remove any target that isn't healthy.",
      "Backend pools can include VMs, scale sets, App Service, AKS, or plain IP/FQDN targets, depending on what's supported. WAF adds managed or custom rules against common web attacks. TLS can either terminate at the gateway or be re-encrypted on the way to the backend.",
      'Cookie-based affinity can keep a client pinned to the same backend when an application needs session stickiness, but a stateless application is easier to scale and recover. Current v2 SKUs support autoscaling and zone redundancy in regions that have Availability Zones.',
      'For centralized certificate management, Application Gateway can pull TLS certificates from Key Vault using a managed identity that has only the access it needs.',
      'Send access, performance, firewall, and health data through diagnostic settings to Azure Monitor/Log Analytics, and alert on unhealthy backends, failed requests, latency, capacity, and WAF events.',
      "To troubleshoot: check the resolved frontend address, listener/SNI and certificate, WAF logs, rule priority, any rewrite/redirect behavior, backend health, probe host/path/status, the NSG/UDR/firewall path, backend TLS trust, and application logs. A healthy gateway doesn't mean the backend is healthy too.",
    ],
    code: [
      {
        title: 'Application Gateway request flow',
        language: 'text',
        code: `client -> frontend IP -> listener -> routing rule
       -> HTTP settings and health probe -> backend pool`,
      },
    ],
    tags: ['azure', 'application gateway', 'waf'],
  },
  {
    id: 'itv-mynet-11',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Azure DNS?',
    probing:
      'Whether you can separate public and private DNS in Azure and troubleshoot split-horizon resolution.',
    answer: [
      "Azure DNS hosts public DNS zones and records. Azure Private DNS handles internal resolution for VNets and private endpoints. Hosting DNS for a domain doesn't register that domain for you.",
      "I delegate public zones by pointing the registrar's NS records at Azure, manage records through IaC, use sensible TTLs, and lock down who can change records. Private zones get linked to the VNets that need them, with records or zone groups set up for private endpoints.",
      'A hybrid setup, where on-premises and Azure both need to resolve the same names, may need Azure DNS Private Resolver or DNS forwarders.',
      "To troubleshoot, I use `dig`/`nslookup`, confirm which server is actually authoritative, check the record type, TTL/cache, the VNet link, forwarding rules, and the client's resolver settings. I query from both an internal and an external client, since split-horizon DNS is often deliberately giving different answers to each.",
    ],
    tags: ['azure', 'dns', 'private dns'],
  },
  {
    id: 'itv-mynet-12',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you connect Azure services privately?',
    probing:
      'Whether you know private endpoints plus private DNS, and how they differ from service endpoints and VNet integration.',
    answer: [
      "I use private endpoints to give supported PaaS services a private IP address inside a VNet, paired with private DNS that maps the service name to that IP. I then disable or restrict public network access, once I've confirmed everything still works.",
      "App Service and Functions use VNet integration for outbound traffic; the private endpoint handles private inbound traffic where that's supported.",
      "Service endpoints are a different, older option for some services and subnets — they still route to the service's public endpoint, so they aren't the same thing as Private Link.",
      "I validate DNS resolution from the actual workload, the route, NSG/firewall rules, endpoint approval, the service's own configuration, and a real TCP/application connection. Hybrid clients also need DNS forwarding and a working VPN/ExpressRoute path. I test that public access is actually denied too, not just that private access works.",
    ],
    tags: ['azure', 'private endpoint', 'private link'],
  },
  {
    id: 'itv-mynet-13',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure Azure networking?',
    probing:
      'Whether you design Azure network security from data flows and trust boundaries and verify it with real tests.',
    answer: [
      'I start by mapping out the data flows and trust boundaries. From there, the usual controls are: subnet segmentation, NSGs, user-defined routes, Azure Firewall or an NVA where traffic needs deep inspection, private endpoints, private DNS, restricted egress, DDoS Protection for exposed critical workloads, a WAF for HTTP applications, and keeping public IPs to a minimum.',
      'Connectivity to on-premises goes over VPN or ExpressRoute, built with redundancy in mind.',
      "I test from the real source, working layer by layer: DNS resolution, routing, effective NSG rules, firewall logs, service firewalls, private endpoint approval, and the application port. Network Watcher's connection troubleshoot tool and flow logs help find exactly where a connection is being denied.",
      "Changes go through IaC and peer review. I turn on diagnostics, alert on unexpected public exposure, review rules regularly, and check both an allowed flow and one that's meant to be denied.",
    ],
    followUps: [
      'How would you detect a resource that was accidentally given a public IP?',
      'Where would you use Azure Firewall rather than NSGs alone?',
    ],
    tags: ['azure', 'network security', 'nsg', 'firewall'],
  },
  {
    id: 'itv-mynet-14',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you connect an application to an Azure database securely, and how do you investigate a failed connection?',
    probing:
      'Whether you combine private networking, managed identity and TLS, and can walk a failed connection layer by layer.',
    answer: [
      "1. Pick the managed database and availability model — Azure SQL, PostgreSQL, MySQL, or Cosmos DB — based on backup needs, zone/region, RTO, RPO, and performance.\n2. Provision it through reviewed IaC, with diagnostic settings on, deletion protection where it's supported, backup retention set, and a private endpoint.\n3. Connect the application over VNet integration, private DNS, routes, and firewall rules scoped as narrowly as possible. Avoid exposing the database publicly unless there's a real, controlled reason to.\n4. Prefer managed identity and Microsoft Entra authentication. If a password or connection secret is unavoidable, store it in Key Vault and pull it at runtime — never bake it into an image or a repository.\n5. Require TLS certificate validation. Use connection pooling, limited timeouts, retry with backoff (waiting a bit longer between each retry), and safe locking during migrations.",
      'Investigation flow for a failed connection:',
      'I test from the real workload identity and subnet, and check both an allowed path and a path that should be denied. I compare Azure Activity/diagnostic logs, and watch connection failures, pool use, query latency, deadlocks, storage, and failover.',
      "An administrator connecting successfully from the portal doesn't prove the application's own connection path works.",
    ],
    code: [
      {
        title: 'Failed connection investigation flow',
        language: 'text',
        code: `DNS/private endpoint → route/NSG/firewall → TCP port → TLS
→ identity/token audience and database user → database health/quota
→ pool exhaustion, timeout, query and application logs`,
      },
    ],
    followUps: [
      'How would you rotate the database credential if managed identity is not supported?',
      'How do you prove the public path is really denied?',
    ],
    tags: ['azure', 'database', 'private endpoint', 'managed identity'],
  },
  {
    id: 'itv-mynet-15',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you put Azure Front Door in front of a Storage static website?',
    probing:
      'Whether you know the Front Door origin/route setup and test performance properly instead of trusting one request.',
    answer: [
      "Azure Front Door is a global entry point. It routes users through Microsoft's edge network, which improves performance and availability. Depending on how it's configured and which tier you use, it can also add caching, TLS termination, custom domains, health probes, and a Web Application Firewall.",
      '**Typical setup**, step by step:',
      '1. Enable static website hosting and upload the site.\n2. Create an Azure Front Door profile and endpoint.\n3. Add the Storage static website endpoint as an origin.\n4. Configure the origin group, route, caching, and custom domain.\n5. Test both the origin URL and the Front Door URL from a few different locations.\n6. Review latency, cache behavior, and health metrics.',
      "Register the required resource provider first if the subscription hasn't used this service before. Test performance from more than one location — a single browser request isn't enough to prove a real improvement.",
    ],
    tags: ['azure', 'front door', 'cdn'],
  },
  {
    id: 'itv-mynet-16',
    level: 'basic',
    kind: 'open',
    prompt:
      'What is the difference between an individual public IP and a public IP prefix in Azure?',
    probing:
      'Whether you know when a contiguous, predictable address range matters, for example for partner allow-lists.',
    answer: [
      'An **individual public IP address** is one public address assigned to a resource — a load balancer, firewall, application gateway, NAT gateway, or network interface.',
      'A **public IP prefix** is a reserved, contiguous range of static public IP addresses (Standard SKU). You can create individual public IP resources out of that range.',
      '- **Scope**: Individual public IP: One address; Public IP prefix: Contiguous address range\n- **Example**: Individual public IP: `52.160.10.15`; Public IP prefix: `52.160.10.0/28`\n- **Management**: Individual public IP: Managed separately; Public IP prefix: Whole range reserved as one resource\n- **Best fit**: Individual public IP: A few endpoints; Public IP prefix: Larger deployments that need predictable addresses\n- **Main benefit**: Individual public IP: Simple setup; Public IP prefix: Consistent addresses, easier for partners to allow-list',
      '**Use an individual IP** for a small number of endpoints. **Use a prefix** when several resources need addresses from a known range — for example outbound NAT, load balancers, or firewalls that external partners need to allow-list.',
    ],
    tags: ['azure', 'public ip'],
  },
  {
    id: 'itv-mynet-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the Network Watcher VM extension, and when do you need it?',
    probing:
      'Whether you can distinguish the Network Watcher service from the in-guest agent some diagnostics require.',
    answer: [
      "Network Watcher is Azure's network monitoring and diagnostics service. Some of its VM-based checks — packet capture and certain connection-monitoring scenarios — need the Network Watcher Agent extension installed on the VM first.",
      'If you start one of these diagnostics and the extension is missing, Azure may install the current version for you automatically. If your change-control process requires a specific version, install and validate it yourself before running the diagnostic.',
      'To query the latest version available in a region:',
      "**Interview summary:** Network Watcher is the service itself. The VM extension is a small in-guest agent that specific diagnostic features need. They're related, but not the same resource.",
    ],
    code: [
      {
        title: 'Install a specific extension version',
        language: 'bash',
        code: `az vm extension set \\
  --resource-group <resource-group> \\
  --vm-name <vm-name> \\
  --name NetworkWatcherAgentWindows \\
  --publisher Microsoft.Azure.NetworkWatcher \\
  --version <desired-version>`,
      },
      {
        title: 'Find the latest version in a region',
        language: 'bash',
        code: `az vm extension image list \\
  --name NetworkWatcherAgentWindows \\
  --publisher Microsoft.Azure.NetworkWatcher \\
  --latest \\
  --location centralindia`,
      },
    ],
    tags: ['azure', 'network watcher'],
  },
  {
    id: 'itv-mynet-18',
    level: 'advanced',
    kind: 'open',
    prompt: 'Explain Azure landing zone hub-and-spoke networking and its typical traffic paths.',
    probing:
      'Whether you can design centralized connectivity and inspection while keeping workload spokes independent.',
    answer: [
      'The hub-and-spoke model keeps shared connectivity separate from application workloads:',
      '- A connectivity subscription hosts the hub VNet and shared services: Azure Firewall, VPN or ExpressRoute Gateway, Bastion, private DNS resolver, private endpoints, Route Server, logging, and network monitoring.\n- Workload subscriptions host their own spoke VNets and application subnets for VMs, AKS, App Service integration, and databases.\n- VNet peering connects the hub to each spoke. User-defined routes in the spokes normally send outbound traffic through Azure Firewall; where needed, route propagation can use BGP and Azure Route Server.\n- Internet traffic coming in can pass through Azure Front Door with WAF/DDoS controls before it reaches the regional application. Traffic from on-premises terminates in the hub, over ExpressRoute or a site-to-site VPN.\n- Private endpoints give supported PaaS services private IP addresses. Private DNS zones and resolver/forwarding rules need to make the same name resolve correctly from both the spokes and on-premises.',
      'Typical traffic paths are:',
      '- **Spoke to internet:** workload → spoke route table → Azure Firewall/NAT policy → internet.\n- **Internet to application:** Front Door/WAF → regional load balancer or application gateway/firewall → spoke application.\n- **On-premises to spoke:** ExpressRoute/VPN → hub gateway → approved hub route → spoke.\n- **Spoke to PaaS:** workload → private endpoint in the private address space, resolved through private DNS.',
      'This design keeps governance, inspection, logging, and hybrid connectivity centralized, while each workload still owns its own spoke. Things worth validating: non-overlapping address ranges, both forward and return routes, gateway transit, firewall policy, DNS resolution, asymmetric routing, and what happens if a shared hub component fails.',
      "The architecture isn't really done until routing, DNS, monitoring, and recovery have all been tested from the real source networks — not just assumed to work.",
    ],
    followUps: [
      'How do you avoid asymmetric routing through the hub firewall?',
      'When would you consider Virtual WAN instead of a self-managed hub?',
    ],
    tags: ['azure', 'hub-and-spoke', 'landing zone', 'design'],
  },
  {
    id: 'itv-mynet-19',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do Azure Load Balancer, a jump VM and Azure Bastion fit into secure administration?',
    probing:
      'Whether you know Layer 4 load balancing basics and can give admins access without public RDP/SSH on every VM.',
    answer: [
      'Azure Load Balancer distributes Layer-4 TCP/UDP traffic using a frontend, a rule, a backend pool, and a health probe. A common path looks like: internet -> public frontend -> load-balancing rule -> healthy VM backend.',
      'Use an internal load balancer for private, tier-to-tier traffic.',
      'A jump VM is a hardened VM used as a stepping stone for admin access — but it still needs patching, identity controls, logging, and network protection like any other VM. Azure Bastion is a managed alternative: it gives RDP or SSH access to private VMs without giving each one a public IP.',
      'Typically a user starts the session through the Azure portal over HTTPS, and Bastion then reaches the VM over its private address — so inbound TCP 22 or 3389 never has to be exposed to the public internet.',
      "Whichever pattern you use, apply least privilege (give access only where it's needed), just-in-time access, session logging, restricted management sources, and a break-glass procedure for emergencies.",
    ],
    tags: ['azure', 'load balancer', 'bastion'],
  },
  {
    id: 'itv-mynet-20',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do NSGs and Azure Firewall work together?',
    probing:
      'Whether you understand that defense in depth needs a deliberate traffic path, not just two products deployed.',
    answer: [
      'NSGs give you distributed, stateful Layer-3/4 filtering close to subnets and NICs. Azure Firewall gives you centralized inspection and policy — network/application rules, threat-intelligence features, DNAT/SNAT, and centralized logs, depending on the SKU and configuration.',
      "In a hub-and-spoke design, use UDRs to steer the traffic that needs inspection through the firewall, and use NSGs to restrict each workload's boundary. Validate that routing is symmetric and check the effective rules — just deploying both products doesn't create defense in depth on its own; you need a deliberate traffic path.",
    ],
    followUps: [
      'How do you validate that routing through the firewall is symmetric?',
      'What would you log centrally, and where?',
    ],
    tags: ['azure', 'nsg', 'firewall', 'udr'],
  },
  {
    id: 'itv-mynet-21',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement policy-based routing in multi-cloud CI/CD?',
    probing:
      'Whether you can route traffic across clouds by policy and plan a migration with rollback and single write ownership.',
    answer: [
      'Use traffic managers (Azure Traffic Manager, GCP Load Balancing), enforce routing rules per region, monitor latency, and shift traffic automatically on failures.',
      '**Mini-case:** Our hybrid GCP-Azure app used geo-routing; during an Azure region outage, traffic auto-shifted to GCP with under 2 minutes of downtime.',
      '**Detailed interview approach:**',
      'I inventory the application, data, network, identity, DNS, compliance, and managed-service dependencies, and set clear RTO/RPO targets and acceptance tests. I build the target environment using separate, provider-specific Terraform modules and private connectivity, migrate one low-risk service first, and keep data replicating continuously.',
      "While both environments run in parallel, I compare correctness, latency, observability, backup, security, and cost. Cutover uses weighted traffic or DNS, with a tested rollback window, and I keep tight control over which side owns writes so I don't end up with split brain.",
      'Once things are stable, I reconcile Terraform and its state, revoke any temporary cross-cloud access, archive the evidence, and only decommission the source resources once retention requirements and business approval are both satisfied.',
    ],
    followUps: [
      'How do you avoid split-brain writes during cutover?',
      'How would you test the automatic failover?',
    ],
    tags: ['multi-cloud', 'routing', 'traffic manager'],
  },
  {
    id: 'itv-mynet-22',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you secure cross-cloud network connectivity between GCP and Azure?',
    probing:
      'Whether you combine encrypted links, least-privilege routing and firewalling, and central audit of cross-cloud flows.',
    answer: [
      'Use encrypted VPN tunnels or cloud interconnects, enforce firewall/security groups on both sides, use mutually authenticated service endpoints, and centralize monitoring/audit of cross-cloud flows.',
      "Grant only the network access that's actually needed, and use private endpoints.",
      '**Mini-case:** We connected GCP and Azure via IPsec tunnels. Route filtering and firewall rules allowed only the required service ports, which stopped an attacker from moving laterally in case of a compromise.',
      '**Detailed interview approach:**',
      'I inventory the application, data, network, identity, DNS, compliance, and managed-service dependencies, and set clear RTO/RPO targets and acceptance tests. I build the target environment using separate, provider-specific Terraform modules and private connectivity, migrate one low-risk service first, and keep data replicating continuously.',
      "While both environments run in parallel, I compare correctness, latency, observability, backup, security, and cost. Cutover uses weighted traffic or DNS, with a tested rollback window, and I keep tight control over which side owns writes so I don't end up with split brain.",
      "Once things are stable, I reconcile Terraform and its state (so the tracked state matches what's actually deployed), revoke any temporary cross-cloud access, archive the evidence, and only decommission the source resources once retention requirements and business approval are both satisfied.",
    ],
    followUps: [
      'IPsec VPN vs dedicated interconnect: how do you choose?',
      'How do you limit lateral movement across the link?',
    ],
    tags: ['multi-cloud', 'vpn', 'security'],
  },
  {
    id: 'itv-mynet-23',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are the prerequisites before importing a VPC in Terraform?',
    probing:
      'Whether you can adopt existing production networking into Terraform without triggering replacements.',
    answer: [
      'I gather the exact details first: account, region, VPC ID, CIDR and IPv6 settings, DNS attributes, tenancy, tags, ownership, and what depends on it. The provider alias and credentials must point at that account and region, and a matching resource block or module address must already exist in code.',
      'I also confirm the VPC is not already managed in another state file.',
      'Importing a VPC does not automatically import the things inside it. Subnets, route tables, gateways, ACLs, endpoints, and peering connections each need their own import and their own address. Before I start, I lock and back up the remote state and decide those addresses up front.',
      'Then I import, run `state show` to see what Terraform recorded, and update the configuration to match without triggering a replacement. I review a full plan and test connectivity afterward.',
      'This process keeps an adoption exercise from accidentally changing production networking.',
    ],
    followUps: [
      'How do import blocks change this workflow?',
      'How would you import the subnets and route tables that belong to the VPC?',
    ],
    tags: ['terraform', 'import', 'aws', 'vpc'],
  },
  {
    id: 'itv-mynet-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you pass arguments to a VPC while using `terraform import`?',
    probing:
      'Whether you understand that import only maps an ID to an address and configuration still lives in code.',
    answer: [
      "You don't. Import only maps a provider resource ID to an existing Terraform address — it does not take configuration arguments. For example:",
      'CIDR, DNS settings, tenancy, and tags belong in the `aws_vpc` resource block, and can be supplied there through variables. After import, I check `terraform state show aws_vpc.prod` and run a plan, then adjust the code until it matches the live VPC with no unexpected changes.',
      "Newer import blocks make the mapping reviewable in code, but they still don't replace writing the resource configuration.",
    ],
    code: [
      {
        title: 'Import an existing VPC',
        language: 'bash',
        code: `terraform import aws_vpc.prod vpc-0123456789`,
      },
    ],
    tags: ['terraform', 'import', 'aws'],
  },
  {
    id: 'itv-mynet-25',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you dynamically retrieve VPC details to create an EC2 instance in Terraform? Write the code.',
    probing:
      'Whether you can use data sources safely and know when a direct resource reference is better.',
    answer: [
      "I use a data source when the VPC is owned by another stack and has a stable, unique tag to search on. I also make sure the query can't accidentally match the wrong environment. For example:",
      "For production I'd pick the subnet by a stable key instead of `[0]`, since list ordering can change. I'd also add the instance role, security groups, an encrypted root disk, tags, and a requirement for IMDSv2 (the safer, token-based way instances fetch metadata).",
      "If the VPC is created in the same root module, I just reference its resource or module output directly. A data source isn't needed, and it would only add a weaker, implicit link between the two.",
    ],
    code: [
      {
        title: 'Look up a VPC and private subnets',
        language: 'hcl',
        code: `data "aws_vpc" "selected" {
  filter {
    name   = "tag:Name"
    values = ["prod-vpc"]
  }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  subnet_id     = data.aws_subnets.private.ids[0]
}`,
      },
    ],
    tags: ['terraform', 'data sources', 'aws'],
  },
  {
    id: 'itv-mynet-26',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What dependencies are needed for an IP address or networking resource?',
    probing:
      'Whether you know the network dependencies behind an address and prefer implicit references over `depends_on`.',
    answer: [
      'It depends on the address type and the traffic path.',
      'A public-facing EC2 instance typically needs a VPC, a subnet that assigns public IPs, an internet gateway with a route, a network ACL, a security group, and an Elastic IP association.',
      'A private address may need route tables, NAT or another egress path, DNS, peering or transit routing, or a load balancer in front of it.',
      "Where one resource references another, like `subnet_id = aws_subnet.public.id`, Terraform works out the order on its own. I prefer that over `depends_on`, because the reference also documents the real relationship between the resources. I only reach for `depends_on` when there's a dependency Terraform can't see from an attribute — for example, waiting for a policy attachment to finish before a service calls an API.",
      'After apply, I check the real thing: that routing works, ACLs and security groups behave as expected, DNS resolves, and the application port responds from the actual source.',
    ],
    tags: ['terraform', 'dependencies', 'aws'],
  },
]
