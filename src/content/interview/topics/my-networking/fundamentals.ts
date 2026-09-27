import type { InterviewQuestion } from '../../../types'

/** Networking fundamentals, Linux and Windows networking, proxies, load balancing and TLS. */
export const myNetworkingFundamentalsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mynet-63',
    level: 'basic',
    kind: 'open',
    prompt: 'What happens when you enter a URL in a browser?',
    probing:
      'Whether you can describe DNS, TCP/QUIC, TLS and HTTP in order and know how to measure each step.',
    answer: [
      "The browser parses the URL, checks its own and the OS's caches, and resolves the hostname through the configured DNS resolver. It opens a TCP connection (or a QUIC connection for HTTP/3), validates the TLS certificate for HTTPS, then sends the HTTP request.",
      "Along the way, DNS, a CDN, a WAF, a load balancer, or a reverse proxy may route the request to an application. That application may call caches, databases, and other services before it sends back a response. The browser then checks the response's security policy, fetches any resources it references, and renders the page.",
      'When I troubleshoot this, I measure each step separately — DNS, connect, TLS, time to first byte, and asset loading — rather than treating "the website" as one single step.',
    ],
    tags: ['fundamentals', 'dns', 'http', 'tls'],
  },
  {
    id: 'itv-mynet-64',
    level: 'basic',
    kind: 'open',
    prompt: 'TCP versus UDP: when would you use each?',
    probing:
      'Whether you understand the delivery guarantees of each protocol rather than repeating "UDP is faster".',
    answer: [
      "TCP is connection-oriented. It delivers data in order and reliably, and manages congestion and flow control itself. It's the normal choice for HTTP/1.1, HTTP/2, SSH, and database protocols.",
      'UDP is connectionless and has less overhead, but it leaves reliability, ordering, and congestion handling up to the application. That makes it a good fit for DNS, voice/video, gaming, and QUIC/HTTP/3.',
      "UDP isn't automatically faster — if an application has to rebuild reliability on top of it and does a poor job, it can end up slower. I choose based on what delivery guarantees are needed, how much latency the use case can tolerate, network conditions, and what the team can actually operate.",
      '**TCP, UDP, and ports**',
      'TCP is connection-oriented and delivers data in order and reliably. A TCP connection starts with the **SYN, SYN-ACK, ACK** handshake, and you can watch its connection states and retransmissions.',
      "UDP is datagram-based, with no connection or delivery guarantee at the transport layer, which is why it suits DNS, streaming, and other latency-sensitive protocols. A listening port just proves a process has bound a socket — it doesn't mean every network hop or the application itself is healthy.",
    ],
    tags: ['fundamentals', 'tcp', 'udp'],
  },
  {
    id: 'itv-mynet-65',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the usual DNS resolution order?',
    probing:
      'Whether you know the cache/hosts/resolver chain and can tell `NXDOMAIN` from a timeout.',
    answer: [
      'The application or browser may check its own cache first, then the OS cache and local entries like `/etc/hosts` (the exact order is controlled by `nsswitch.conf` on Linux), before it queries the configured recursive resolver.',
      'The resolver checks its own cache, and on a miss, walks from the root servers to the TLD servers to the authoritative server — or it hands the query off to a forwarder.',
      "TTL controls how long an answer gets cached, and split-horizon DNS can intentionally return different answers depending on whether you're inside or outside a network. I verify all this with `getent hosts`, `dig`, the resolver configuration, TTL values, and by checking exactly which client network I'm testing from.",
      '**DNS**: DNS maps names to records through a chain: local cache/resolver, then recursive resolvers, then authoritative servers. Learn to tell `NXDOMAIN` (a real negative answer) apart from a timeout (something upstream is broken or unreachable).',
      'Check the record type being requested, search domains, split-horizon or private zones, TTL/cache, upstream forwarding, and whether UDP and TCP port 53 are actually allowed through. Confirm the address you resolved is really the endpoint you meant, before you start troubleshooting the service itself.',
    ],
    tags: ['fundamentals', 'dns'],
  },
  {
    id: 'itv-mynet-66',
    level: 'basic',
    kind: 'open',
    prompt: 'Forward proxy versus reverse proxy: what is the difference?',
    probing:
      'Whether you know which side of the trust boundary each proxy sits on and what it is used for.',
    answer: [
      'A forward proxy sits in front of clients and represents them to the internet — commonly used for controlled egress, filtering, authentication, and caching. The client is explicitly configured to use it.',
      'A reverse proxy sits in front of servers and represents them to clients. It terminates TLS, routes requests, load-balances, caches, and can apply a WAF or rate limits in front of the application.',
      "Both can proxy HTTP, but they sit on opposite sides of the trust boundary and are owned by different parties. I preserve the real client's identity safely, using trusted forwarding headers, and set TLS, timeouts, and logging deliberately rather than by default.",
    ],
    tags: ['fundamentals', 'proxy'],
  },
  {
    id: 'itv-mynet-67',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot a network problem layer by layer instead of guessing?',
    probing:
      'Whether you have a repeatable layered model and know what each test does and does not prove.',
    answer: [
      'Trace the real request in layers instead of guessing:',
      'The OSI model is a useful way to organize evidence: physical/link, IP routing, transport, TLS/session, and application protocol. A successful `ping` only proves an ICMP path works. It says nothing about DNS, the TCP port, TLS, authentication, or whether the application is healthy.',
    ],
    code: [
      {
        title: 'Layered troubleshooting path',
        language: 'text',
        code: `name resolution → source address and route → firewall/ACL/NAT
→ TCP or UDP reachability → TLS → proxy/load balancer
→ service listener → application and dependency response`,
      },
    ],
    tags: ['fundamentals', 'troubleshooting', 'osi'],
  },
  {
    id: 'itv-mynet-68',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain IP addressing, CIDR and subnet sizing.',
    probing:
      'Whether you can size subnets, account for cloud-reserved addresses and avoid overlapping ranges.',
    answer: [
      'An IP address identifies a network interface. The prefix length says how many bits represent the network — for example `10.20.4.0/24`.',
      'A host treats anything inside its own subnet as directly reachable and uses ARP or neighbor discovery to find it. Anything outside the subnet goes through a route, usually the default gateway. Overlapping address ranges cause routing ambiguity in peering, VPN, container, and multi-cloud setups.',
      "For IPv4, a `/24` has 256 total addresses, a `/26` has 64, and a `/30` has 4. Traditional (non-cloud) subnetting usually counts 254, 62, and 2 of those as usable host addresses. Cloud providers reserve a few extra addresses in every subnet, though, so always check the platform's actual rules before assuming a number is usable.",
      "Pick non-overlapping ranges with room to grow — for load balancers, private endpoints, Kubernetes nodes and pods, and hybrid connectivity. CIDR planning affects VPC/VNet peering, VPNs, routing, firewalls, and any future merger. It's hard to fix overlapping networks after they're already connected.",
    ],
    tags: ['fundamentals', 'cidr', 'subnets'],
  },
  {
    id: 'itv-mynet-69',
    level: 'basic',
    kind: 'open',
    prompt: 'How do routing and NAT work, and why check the return path?',
    probing:
      'Whether you know longest-prefix matching, asymmetric routing and that NAT gateways do not create inbound access.',
    answer: [
      "Routers pick the most specific route that matches. When troubleshooting, always check both the forward and return path — an outbound packet that's allowed can still fail because of asymmetric routing or a missing return route.",
      'NAT rewrites the source or destination address of a packet. A cloud NAT gateway normally lets a private subnet reach the internet outbound, but it does not create any inbound access.',
    ],
    tags: ['fundamentals', 'routing', 'nat'],
  },
  {
    id: 'itv-mynet-70',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between stateful firewalls/security groups and stateless ACLs?',
    probing:
      'Whether you know that stateless ACLs need the ephemeral return ports and how to prove which rule drops traffic.',
    answer: [
      "Stateful controls remember a connection once it's allowed, and automatically allow its return traffic. Stateless ACLs check inbound and outbound packets separately — including the ephemeral return ports — since they don't track connection state.",
      "Write rules with least privilege: only the source, destination, protocol, and port that's actually needed. Don't open everything as a shortcut. Use flow logs, packet capture, and counters to prove exactly which rule or hop is dropping the traffic.",
    ],
    tags: ['fundamentals', 'firewall', 'acl'],
  },
  {
    id: 'itv-mynet-71',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key commands for investigating a network issue?',
    probing:
      'Whether you have a practical toolkit for addresses, routes, sockets, DNS, TCP, TLS and packet capture.',
    answer: [
      'These are the commands I reach for, run from the affected source network:',
      "Run these tests from the actual affected source network, and compare against a path that's known to work. After a targeted fix, confirm the real application transaction succeeds, remove any temporary access you granted, keep monitoring errors and latency, and write down the preventive control you added.",
    ],
    code: [
      {
        title: 'Network investigation commands',
        language: 'bash',
        code: `ip -br address
ip route
ip route get <destination>
ss -lntup
dig <name>
curl -vk https://<host>/health
nc -vz <host> <port>
traceroute <host>
mtr <host>
tcpdump -ni any host <address> and port <port>`,
      },
    ],
    tags: ['fundamentals', 'commands', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-72',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you check if a port is open or listening?',
    probing:
      'Whether you can check the listening address with `ss` and test reachability layer by layer.',
    answer: [
      "On the server I run `sudo ss -lntp '( sport = :443 )'` to see the listening address, port, PID, and process. `127.0.0.1:443` only accepts local traffic, while `0.0.0.0:443` listens on every IPv4 interface, subject to the firewall.",
      'Then I test each layer separately: `nc -vz host 443` from the real client network to check the TCP connection, `curl -vk https://host/health` to check the application itself, and `nft list ruleset` or the cloud security group to check filtering.',
      "A listening socket doesn't prove the application is healthy, and a failed remote test doesn't prove the service is down — routing, ACLs, NAT, TLS, or the application itself could each be the cause.",
    ],
    tags: ['linux', 'ports', 'ss'],
  },
  {
    id: 'itv-mynet-73',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'You cannot SSH into a remote machine. How do you debug?',
    probing:
      'Whether you use the exact SSH error to pick the next check and avoid weakening security.',
    answer: [
      'I let the exact client error guide the next step. A timeout points to routing, a firewall, or a security group. "Connection refused" means nothing is listening. "Permission denied" means the connection reached SSH but authentication failed.',
      'I run `ssh -vvv user@host`, check DNS resolves correctly, and test `nc -vz host 22` from the same network the client is on.',
      "Using console or bastion access, I check `ss -lntp`, `systemctl status sshd`, `sshd -t`, the host firewall, disk space, and `/var/log/auth.log` or `/var/log/secure`. For key problems I check the intended user, the ownership of the home directory and `.ssh`, that `.ssh` is mode `700`, that `authorized_keys` is mode `600`, and the server's SSH configuration.",
      "I make one controlled fix at a time and retest. I don't weaken authentication or open port 22 to the whole internet as a shortcut.",
    ],
    tags: ['linux', 'ssh', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-74',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Ping works, but SSH fails using hostname. Why?',
    probing: 'Whether you know ping only proves ICMP and can find DNS, IPv6 or host-key causes.',
    answer: [
      "Ping only proves an ICMP reply came back — it doesn't prove TCP port 22 or SSH authentication works. I compare `getent ahosts hostname` against the expected IP, test both `ssh -vvv user@hostname` and `ssh user@IP`, and check `nc -vz hostname 22`.",
      "If the IP works but the hostname doesn't, the likely causes are a stale or wrong DNS record, IPv6 being picked when only IPv4 works, an SSH `Host` rule in `~/.ssh/config`, or a host-key mismatch after the address changed.",
      'I fix the DNS or client config, and I verify the host key through a trusted source before updating `known_hosts`. I never just delete a host-key warning, since it can be a sign of a man-in-the-middle attack.',
    ],
    tags: ['linux', 'ssh', 'dns'],
  },
  {
    id: 'itv-mynet-75',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you enable SSH key authentication between two Linux servers?',
    probing: 'Whether you can set up key-based SSH and explain which key goes where and why.',
    answer: [
      'The goal is to let Server A connect to Server B with a key instead of a password.',
      '**Generate a key on Server A**',
      'This generates two files:',
      '- `~/.ssh/id_ed25519` — the private key. Keep it secure and never copy it to Server B.\n- `~/.ssh/id_ed25519.pub` — the public key. This one is safe to copy to Server B.',
      '**Copy the public key to Server B**',
      'This adds the public key to `~/.ssh/authorized_keys` on Server B with the right permissions.',
      '**Test the connection**',
      "SSH may ask for the private key's passphrase if you set one, but it should not ask for the remote account's password.",
      '**How it works**, at a glance:',
      '- SSH uses public-key cryptography.\n- Server B checks whether the public key is listed in `~/.ssh/authorized_keys`.\n- Server A proves it holds the matching private key.\n- The private key never leaves Server A.',
    ],
    code: [
      {
        title: 'Generate a key on Server A',
        language: 'bash',
        code: `ssh-keygen -t ed25519`,
      },
      {
        title: 'Copy the public key to Server B',
        language: 'bash',
        code: `ssh-copy-id user@serverB`,
      },
      {
        title: 'Test the connection',
        language: 'bash',
        code: `ssh user@serverB`,
      },
    ],
    tags: ['linux', 'ssh'],
  },
  {
    id: 'itv-mynet-76',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What if SSH key authentication still asks for the account password?',
    probing:
      'Whether you know the permission and sshd settings that break key auth, and change sshd safely.',
    answer: [
      'On Server B, check the ownership and permissions:',
      'Test the configuration before reloading SSH:',
      'Keep your current session open until a second session connects successfully. Disabling password authentication is a separate hardening step — only do that after key access and a backup access method are confirmed to work.',
    ],
    code: [
      {
        title: 'Fix .ssh permissions',
        language: 'bash',
        code: `chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys`,
      },
      {
        title: 'sshd_config setting',
        language: 'text',
        code: `PubkeyAuthentication yes`,
      },
      {
        title: 'Validate and reload sshd',
        language: 'bash',
        code: `sudo sshd -t
sudo systemctl reload sshd`,
      },
    ],
    tags: ['linux', 'ssh', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-77',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you check and configure a static IP address?',
    probing:
      'Whether you check who owns network config and avoid locking yourself out of a remote server.',
    answer: [
      'I first capture the current address, interface, gateway, routes, DNS, and whether NetworkManager or Netplan owns the config: `ip -br addr`, `ip route`, `resolvectl status`, and `nmcli connection show`. I confirm the new IP is reserved and not already in use.',
      'With NetworkManager, for example:',
      'On a remote server I use console access or set up an automatic rollback, since a bad gateway can lock me out. Afterward I verify the address, route, DNS, gateway, and remote connectivity, and update the inventory or DNS documentation.',
    ],
    code: [
      {
        title: 'Set a static IP with nmcli',
        language: 'bash',
        code: `sudo nmcli con mod "System eth0" ipv4.method manual \\
  ipv4.addresses 10.0.1.20/24 ipv4.gateway 10.0.1.1 \\
  ipv4.dns "10.0.0.10 10.0.0.11"
sudo nmcli con up "System eth0"`,
      },
    ],
    tags: ['linux', 'networking', 'nmcli'],
  },
  {
    id: 'itv-mynet-78',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot an NFS mount issue?',
    probing: 'Whether you separate discovery, mounting and permissions when NFS fails.',
    answer: [
      "I treat discovery, mounting, and permissions as three separate things to check. From the client I verify DNS and routing and run `showmount -e server` where it's supported, then try a verbose temporary mount like `mount -v -t nfs -o vers=4 server:/export /mnt/test`.",
      "I check `journalctl -k` and the client's NFS logs for timeout, access, or protocol errors.",
      'On the server I check the NFS services, `/etc/exports`, `exportfs -v`, the firewall, and that the exported directory actually exists. If the mount works but access fails, I compare the numeric UID/GID on each side, root-squash behavior, ACLs, and SELinux.',
      'I agree on the NFS version and safe timeout options, test reads and writes with the real service account, and only then make the entry in `/etc/fstab` or the automounter permanent.',
    ],
    tags: ['linux', 'nfs', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-79',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Linux server suddenly becomes unreachable. How do you troubleshoot it?',
    probing:
      'Whether you define "unreachable" precisely and work from a known-good location to the host itself.',
    answer: [
      'First I pin down what "unreachable" actually means: monitoring lost contact, DNS is failing, ping fails, SSH times out, the connection is refused, or only the application is down. I check how much is affected and whether there was a recent network, firewall, DNS, OS, or cloud change, then use the provider\'s console or out-of-band access if I can\'t reach it normally.',
      'From a known-good location I check DNS and the IP, the route, the TCP port, and the path using `dig`, `ip route get`, `nc -vz`, `traceroute`/`mtr`, and flow or firewall logs.',
      'On the server itself I check the interface, link, address, and routes, `ss -lntup`, the firewall rules (nftables/iptables/firewalld), the SSH/service state, CPU and memory, disk and inodes, kernel logs, failed logins, and cloud security rules.',
      "A failed ping alone doesn't prove anything, since ICMP is often blocked anyway.",
      "I fix the narrow layer that's actually broken — a route, an address, a firewall rule, a service, capacity, or the host — using a safe rollback where possible.",
      'Then I verify SSH and the real application work from the affected network, remove any temporary access I opened, confirm monitoring recovers, and prevent it happening again with redundant access paths, infrastructure-as-code review, configuration rollback, capacity alerts, and a tested console procedure.',
    ],
    followUps: [
      'What out-of-band access would you want before this happens?',
      'How do you prevent a bad firewall change from locking you out?',
    ],
    tags: ['linux', 'troubleshooting', 'incident'],
  },
  {
    id: 'itv-mynet-80',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you investigate intermittent packet loss between containers or nodes?',
    probing:
      'Whether you measure first and know the common node-level causes: interface drops, conntrack exhaustion, MTU and DNS.',
    answer: [
      'I work through it in this order:',
      '1. Measure it: `ping`, `mtr <target>` (shows exactly where the loss starts, hop by hop), and `iperf3` for throughput.\n2. Check interface errors and drops: `ip -s link`, `ethtool -S eth0`, `netstat -s` (retransmits, drops).\n3. Check for conntrack exhaustion — this is very common on busy nodes. Look at `sysctl net.netfilter.nf_conntrack_count` / `_max`, and check `dmesg` for "nf_conntrack: table full".\n4. Check the CNI and overlay network. A MTU mismatch on overlay networks (VXLAN adds about 50 bytes) causes fragmentation and drops, so verify the pod MTU. Also inspect the CNI plugin (Calico, Cilium, or Flannel) and its `iptables`/`ipvs` rules.\n5. Check DNS. Intermittent DNS failures often look like packet loss — check CoreDNS, the classic conntrack race on musl/Alpine, and `ndots`.\n6. Check the node, NIC, and upstream network: cloud provider network health, security groups/NACLs, and whether the physical NIC is close to saturated.',
    ],
    followUps: [
      'How do you confirm conntrack exhaustion is the cause?',
      'Why does VXLAN reduce the usable MTU?',
    ],
    tags: ['linux', 'packet loss', 'conntrack', 'mtu'],
  },
  {
    id: 'itv-mynet-81',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you check listening ports on Windows?',
    probing: 'Whether you can map a listening port to its process on Windows and test it remotely.',
    answer: [
      '`netstat -ano` works too. I check whether the service is listening on the interface I expect — `127.0.0.1`, a private IP, or all interfaces — map the PID to its process or service, and then check Windows Firewall, network security rules, routing, DNS, and any load-balancer probes upstream.',
      "A port listening locally doesn't prove it's reachable remotely, so I test from the actual client network and check the logs on both ends.",
    ],
    code: [
      {
        title: 'Listening ports and remote test',
        language: 'powershell',
        code: `Get-NetTCPConnection -State Listen |
  Sort-Object LocalPort |
  Select-Object LocalAddress, LocalPort, OwningProcess

Get-Process -Id <pid>
Test-NetConnection server.example.com -Port 443`,
      },
    ],
    tags: ['windows', 'ports', 'powershell'],
  },
  {
    id: 'itv-mynet-82',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you manage Windows Firewall rules?',
    probing:
      'Whether you write narrow, scoped firewall rules and manage them as code rather than by hand.',
    answer: [
      'I write narrow, documented rules scoped by protocol, port, direction, profile, program or service, and remote address.',
      'Before touching production I export and review the current policy and confirm exactly what was requested. Then I test with both an allowed source and a denied source.',
      'I deploy rules through Group Policy, configuration management, or infrastructure-as-code wherever possible, rather than making unmanaged manual changes. Logging and a periodic review help catch rules that are unused or too broad.',
    ],
    code: [
      {
        title: 'Allow HTTPS from the load balancer subnet',
        language: 'powershell',
        code: `New-NetFirewallRule -DisplayName 'Allow HTTPS from load balancer' \`
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 \`
  -RemoteAddress 10.20.0.0/24 -Profile Domain`,
      },
    ],
    tags: ['windows', 'firewall', 'powershell'],
  },
  {
    id: 'itv-mynet-83',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is PowerShell remoting?',
    probing:
      'Whether you know WinRM remoting, how to lock it down and the common failure causes such as double-hop.',
    answer: [
      'PowerShell remoting runs commands on a remote system, usually over WinRM — using Kerberos inside a domain, or HTTPS with certificates where that fits better.',
      'I restrict it with firewall scoping, groups that only get the access they need, Just Enough Administration endpoints, logging and transcription, and secure authentication. I avoid TrustedHosts wildcards and plaintext credentials.',
      'When troubleshooting, I look at DNS, time sync and Kerberos, the WinRM listener, the firewall, SPNs, user permissions, and the double-hop problem.',
    ],
    code: [
      {
        title: 'Test WinRM and run a remote command',
        language: 'powershell',
        code: `Test-WSMan server01
Invoke-Command -ComputerName server01 -ScriptBlock {
    Get-Service W3SVC
}`,
      },
    ],
    tags: ['windows', 'powershell', 'winrm'],
  },
  {
    id: 'itv-mynet-84',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot RDP connection issues?',
    probing:
      'Whether you check network, service, authentication and capacity separately for RDP failures.',
    answer: [
      'I treat network, service, authentication, and capacity as separate things to check:',
      "1. Resolve the correct IP and test TCP 3389 from the client.\n2. Check the cloud security group, Windows Firewall, VPN/routes, and NAT.\n3. Confirm Remote Desktop Services is running and listening.\n4. Verify the user is allowed to connect, the account isn't locked, and NLA, time sync, and domain trust are all healthy.\n5. Check the TerminalServices and Security event logs, and see who's currently connected.\n6. Use Bastion or a serial/console connection for recovery, rather than opening RDP up broadly.",
      "Once it's fixed, I remove any temporary access I opened, confirm normal approved connections still work, and keep RDP private behind a VPN or Bastion with MFA and monitoring.",
    ],
    tags: ['windows', 'rdp', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-85',
    level: 'basic',
    kind: 'open',
    prompt: 'What can Nginx do, and how do you change its configuration safely?',
    probing:
      'Whether you know the main Nginx roles and always validate with `nginx -t` before a graceful reload.',
    answer: [
      'Nginx can serve static content, reverse-proxy dynamic requests, balance traffic across backends, terminate TLS, cache responses, compress content, enforce rate limits, add security headers, and act as a Kubernetes ingress controller.',
      "Always validate a configuration change with `nginx -t` and reload it gracefully — don't just restart blindly.",
    ],
    tags: ['nginx', 'reverse proxy'],
  },
  {
    id: 'itv-mynet-86',
    level: 'basic',
    kind: 'open',
    prompt: 'Layer 4 versus Layer 7 load balancers: what is the difference?',
    probing: 'Whether you know what each layer can see and when content-aware routing is worth it.',
    answer: [
      "Layer 4 balances TCP or UDP traffic based on IP address and port. It's less aware of the application, but usually faster and lower-latency. Layer 7 understands application protocols like HTTP, so it can route by host, path, header, cookie, or method. It can also terminate TLS, apply WAF/authentication, rewrite requests, and give you richer metrics.",
      'I use Layer 4 for protocol-agnostic or very high-throughput transport, and Layer 7 for web/API traffic that needs content-aware routing and policy. Either way, you still need health checks, connection draining, timeouts, and good observability.',
      '**Load balancers and proxies: what to check**',
      'Layer-4 load balancers route TCP/UDP connections. Layer-7 proxies understand HTTP itself — host, path, headers, redirects, cookies. Check the listener, certificate/SNI, routing rule, target group/endpoint, health-probe path, backend port, whether the source IP is preserved, timeouts, and the actual application response.',
      'A healthy load-balancer resource with unhealthy or wrong backends still fails users.',
    ],
    tags: ['load balancer', 'layer 4', 'layer 7'],
  },
  {
    id: 'itv-mynet-87',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which load-balancing methods would you use and what are their trade-offs?',
    probing:
      'Whether you can match a balancing method to the workload and know the persistence trade-offs.',
    answer: [
      'Round robin spreads requests evenly, which works well when each request costs about the same. Least connections works better when connection duration varies; weighted versions of either handle backends with unequal capacity.',
      'Fastest/least-response-time methods can adapt to a slow backend, but only if the measurements behind them are trustworthy. Hash or consistent-hash methods give you affinity for caches or session state, while source-IP persistence is simpler but can create imbalance when clients sit behind NAT.',
      "I prefer stateless applications with explicit session storage where possible. I only add persistence when it's genuinely required, and I combine it with health checks, slow-start/connection draining, and capacity-aware weights.",
    ],
    tags: ['load balancing', 'algorithms'],
  },
  {
    id: 'itv-mynet-88',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is an F5 iRule?',
    probing:
      'Whether you know iRules are event-driven Tcl in the data path and should be kept small and tested.',
    answer: [
      "An iRule is a small piece of event-driven Tcl code attached to BIG-IP's traffic processing. It can inspect or modify requests, pick a pool, redirect traffic, enforce policy, add headers, or make routing decisions at events like `HTTP_REQUEST`.",
      "I keep iRules small, reviewed, version-controlled, and tested on a non-production virtual server, because a slow or incorrect rule sits directly in the data path. Native BIG-IP policy/profile configuration is preferable whenever it can do the job — custom code is for behavior the product can't express declaratively.",
    ],
    tags: ['f5', 'irule', 'load balancer'],
  },
  {
    id: 'itv-mynet-89',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are Virtual Servers, Pools, Pool Members and Nodes on F5 BIG-IP?',
    probing: 'Whether you know the BIG-IP object model and troubleshoot it from listener to node.',
    answer: [
      'A Virtual Server is the client-facing listener — its virtual IP, port, and profiles. It forwards traffic to a Pool, which is a logical set of backend targets plus its health-check and load-balancing policy.',
      'A Pool Member is a specific service endpoint, usually an address plus a port, such as `10.0.1.20:8443`. A Node is the underlying IP address, and it can host more than one pool member.',
      'I troubleshoot in this order: listener/TLS/rules first, then pool availability and monitor results, then member port/application health, and finally node/network reachability.',
    ],
    tags: ['f5', 'load balancer'],
  },
  {
    id: 'itv-mynet-90',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A website starts returning HTTP 503. How do you investigate it?',
    probing:
      'Whether you identify which component generated the 503 and trace the full path before changing anything.',
    answer: [
      "An HTTP 503 means some component in the path was reached, but it couldn't serve the request right now. First I capture the response headers/body to figure out whether the CDN, WAF, load balancer, reverse proxy, service mesh, or the application itself generated it.",
      'I compare which hosts, paths, regions, users, and times are affected, and check for recent deployments, config changes, certificate changes, scaling events, or dependency incidents.',
      'I trace the path: DNS → frontend listener/TLS → routing rule → target pool → health probe → backend listener/application → dependencies.',
      "I look at the healthy-target count, the proxy's upstream status and timing, backend readiness, capacity, connection pools, queue depth, timeouts, retry amplification, rate limits, and logs/traces for the same request ID.",
      'A healthy load-balancer resource with zero healthy targets still returns errors to users.',
      "I restore service through a rollback, a traffic shift, added capacity, or a specific fix to routing/probe/backend/dependency. I don't open broad firewall rules or blindly increase every timeout.",
      'Afterward I confirm sustained real-user traffic works, check p95/p99 latency, 5xx rate by source and backend, and failover behavior, and set up alerts for target loss, saturation (how close a resource is to its limit), and SLO burn.',
    ],
    followUps: [
      'How do retries make a 503 incident worse?',
      'Which alert would have caught this before users did?',
    ],
    tags: ['503', 'load balancer', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-91',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A website works by IP but not by hostname. How do you troubleshoot it?',
    probing:
      'Whether you check DNS, virtual-host routing and TLS SNI instead of stopping at a successful ping.',
    answer: [
      "Compare `dig`/`nslookup` output against the address you expect, test the FQDN and the IP using the same protocol, and check the local resolver/search settings, DNS TTL/cache, split-horizon DNS, the virtual host's `Host`-based routing, TLS SNI/certificate, and the proxy configuration.",
      'Pinging the IP only proves ICMP reachability — it says nothing about DNS, TCP, TLS, or HTTP.',
    ],
    tags: ['dns', 'nginx', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-92',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Hosts in the same subnet cannot communicate. What do you check?',
    probing:
      'Whether you check layer 2 details such as mask, VLAN and ARP, and capture on both hosts.',
    answer: [
      'Check the address, prefix/mask, interface/link, VLAN, ARP/neighbor entries, host firewall, network ACL, and switch port. Capture ARP and ICMP traffic on both hosts to see whether requests actually leave and replies actually come back.',
      'A duplicate address or a wrong mask can make a host pick the wrong on-link behavior.',
    ],
    tags: ['fundamentals', 'arp', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-93',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A static route does not carry traffic. How do you troubleshoot it?',
    probing: 'Whether you check next-hop reachability, longest-prefix match and the return route.',
    answer: [
      'Check that the next hop is reachable through an active interface, that the route is actually installed, that longest-prefix matching picks it over another route, that a return route exists, and that no policy route, ACL, NAT, or security group is blocking the flow.',
      "`ip route get <destination>`, traceroute, the device's route table, and packet capture will show exactly where traffic stops.",
    ],
    tags: ['routing', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-94',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A server works on the LAN but not externally. How do you troubleshoot it?',
    probing:
      'Whether you trace public DNS, NAT/load balancer, firewall and the return path without opening everything.',
    answer: [
      'Trace the path: public DNS → public IP/NAT/load balancer → firewall → route → server listener → return path. Check the health-probe source ranges and ports, the default gateway, asymmetric routing, virtual-host/TLS configuration, and application health.',
      "Don't expose every source or port as a diagnostic shortcut.",
    ],
    tags: ['nat', 'firewall', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-95',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'An application is slow. Is it the network or the server, and how do you tell?',
    probing:
      'Whether you break latency into DNS, connect, TLS, TTFB and download, and compare with server-side evidence.',
    answer: [
      'Measure end-to-end latency and break it into DNS, connect, TLS, time to first byte, and download. Check for packet loss/retransmission and path latency with `mtr`, look at interface errors/utilization and packet captures, then compare server CPU, memory, I/O, connection pools, query and dependency latency, logs, and traces.',
      "Follow one request across the whole path — don't blame the network just because it sits between the user and the server.",
    ],
    followUps: [
      'Which `curl` timing fields would you use?',
      'What does retransmission in a packet capture tell you?',
    ],
    tags: ['latency', 'troubleshooting', 'performance'],
  },
  {
    id: 'itv-mynet-96',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'One company site is down. How do you handle it?',
    probing:
      'Whether you confirm scope, check physical and WAN layers and routing, and fail over safely.',
    answer: [
      "Confirm the scope of the outage, check power and the physical link, the WAN circuit and provider status, tunnel/BGP/OSPF/static routes, the firewall and DNS, and any recent changes. Compare both directions of traffic, and only use the documented backup circuit after confirming the failover won't create a loop or asymmetric filtering.",
      'Keep provider and device evidence for the incident review.',
    ],
    followUps: [
      'What could go wrong when switching to the backup circuit?',
      'What evidence would you keep for the incident review?',
    ],
    tags: ['wan', 'incident', 'routing'],
  },
  {
    id: 'itv-mynet-97',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you find and fix duplicate IP addresses?',
    probing:
      'Whether you can confirm a conflict with ARP, MAC tables and DHCP logs, and prevent it with IPAM.',
    answer: [
      'Confirm the conflict through ARP/neighbor table changes, switch MAC tables, DHCP logs, and packet capture. Isolate or re-address the wrong device, clear stale neighbor entries carefully, and confirm which device should actually own the address.',
      'DHCP reservations, IP address management, conflict detection, controlled static ranges, and switch security all reduce how often this happens.',
    ],
    tags: ['ip addressing', 'dhcp', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-98',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot high latency on a load balancer?',
    probing:
      'Whether you compare load balancer total time with backend time to locate where latency lives.',
    answer: [
      "First I figure out where the latency actually is: DNS/connect/TLS, load-balancer processing, the backend connection, or the application's own response time. I compare the load balancer's total time against the backend's response time, status codes, healthy target count, connection limits, TLS handshake time, request rate, and how traffic is spread across regions.",
      'Then I check backend CPU/memory, queue depth, pod readiness, application traces, database/cache dependencies, network drops, and any recent changes. High total time with low backend time points toward the edge, network, or TLS. High backend time means the problem is downstream.',
      'I mitigate safely — by removing bad targets, scaling, rolling back, or shifting traffic — then confirm p95/p99 latency and error rate have actually recovered, and write down the root cause.',
    ],
    tags: ['load balancer', 'latency', 'observability'],
  },
  {
    id: 'itv-mynet-99',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you monitor API performance in Azure API Management or an API gateway?',
    probing:
      'Whether you track gateway vs backend latency and tie alerts to SLO impact without logging secrets.',
    answer: [
      "I track request volume, the success/error ratio by status code, gateway latency, backend latency, throttling, cache hit rate, policy errors, backend health, and dependency failures. Application Insights or OpenTelemetry links the gateway's requests to the backend's traces, while Azure Monitor and APIM diagnostics give me the platform-level data.",
      'When latency increases, I compare gateway time against backend time, break it down by API/operation/region/status, and check for recent policy or deployment changes, quota limits, TLS/DNS issues, and backend capacity. I sample payload metadata carefully, without logging tokens or sensitive request bodies.',
      'Alerts are tied to actual SLO/error-budget impact, and synthetic tests exercise both authentication and a real, lightweight API call.',
      '**From a similar question (Apigee/Azure API Management)**',
      'Collect API response time, error rate, and request logs. Add dashboards for the service target, configure useful alerts, and apply rate limiting where needed.',
      '**Mini-case:** Apigee showed a 30% response-time increase for one backend API. The backend pods were at their resource limit, so scaling them restored normal response times.',
      '**Detailed interview approach:**',
      'I start by defining the signals that actually matter: availability, latency, errors, traffic, saturation (how close a resource is to its limit), and the business outcomes they map to. Then I collect correlated metrics, structured logs, and traces, all tagged consistently with service, environment, version, and request ID.',
      'Dashboards should show both the symptom and the likely dependency behind it. Alerts are tied to SLOs and route with the right severity, owner, and runbook.',
      "At scale, I combine or downsample old metrics, sample traces intelligently, and set hot/warm/cold log retention based on what's actually needed for debugging and compliance. During an incident, I follow a single request across every layer and compare it against recent deployment/config changes.",
      'I regularly check that alerts actually fire and recover as expected, and I tune out noisy or unactionable ones.',
    ],
    tags: ['api management', 'apigee', 'observability'],
  },
  {
    id: 'itv-mynet-100',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you investigate high API latency in GCP/Azure APIs?',
    probing:
      'Whether you use tracing to find slow endpoints and then fix capacity or caching based on evidence.',
    answer: [
      'Check Cloud Trace / Application Insights → Identify slow endpoints → Scale backend pods → Add caching/CDN.',
      '**Detailed interview approach:**',
      'I start by defining the signals that actually matter: availability, latency, errors, traffic, saturation, and the business outcomes they map to. Then I collect correlated metrics, structured logs, and traces, all tagged consistently with service, environment, version, and request ID.',
      'Dashboards should show both the symptom and the likely dependency behind it. Alerts are tied to SLOs and route with the right severity, owner, and runbook.',
      "At scale, I combine or downsample old metrics, sample traces intelligently, and set hot/warm/cold log retention based on what's actually needed for debugging and compliance. During an incident, I follow a single request across every layer and compare it against recent deployment/config changes.",
      'I regularly check that alerts actually fire and recover as expected, and I tune out noisy or unactionable ones.',
      '**From a similar question (handling high latency in GCP/Azure services)**',
      '- Check network logs.\n- Use Cloud Monitoring (Stackdriver/Azure Monitor).\n- Scale infra (VMs, AKS nodes).\n- Optimize load balancer & caching.',
      '**Detailed interview approach:**',
    ],
    tags: ['latency', 'observability', 'tracing'],
  },
  {
    id: 'itv-mynet-101',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot, renew and deploy an expired TLS certificate on a web server?',
    probing:
      'Whether you check the certificate actually served, renew safely, reload gracefully and prevent a repeat.',
    answer: [
      'An expired TLS certificate causes browser trust warnings, such as `ERR_CERT_DATE_INVALID`, and blocks the secure connection entirely. First capture the exact hostname, port, SNI, the client error, and the certificate that was actually served.',
      "Check `notBefore`/`notAfter`, the SAN hostname, the issuer, the full chain, the server's clock, and whether a CDN, load balancer, or proxy is serving a different certificate than the backend.",
      '**Renewal and issuance**',
      "For **Let's Encrypt**, check the Certbot timer/status, renewal logs, whether the HTTP-01/DNS-01 challenge is reachable, DNS, the firewall, and rate limits, before you run a renewal.",
      'For a **purchased certificate**, generate and protect the key/CSR through the approved process, then install the issued leaf certificate along with the correct intermediate chain.',
      'Never copy private keys into Git or into chat.',
      '**Deployment and validation**',
      "Update the exact listener/server paths and permissions, validate the configuration (`nginx -t` or the platform's equivalent), reload gracefully where you can, and retest from an external client using SNI.",
      "Confirm the new expiry date, hostname, chain, OCSP behavior where it's used, every load-balancer/region endpoint, and that the application is healthy.",
      "Restarting the service will **not** fix the issue if you haven't actually replaced the active certificate.",
      '**Preventing recurrence**',
      '- Certificate inventory and ownership\n- Automated renewal\n- Monitoring at 30/14/7 days\n- Renewal and reload tests\n- Updated CA contacts\n- Protected key rotation\n- Alerts on failed challenge or mismatched endpoints',
    ],
    tags: ['tls', 'certificates', 'lets encrypt'],
  },
  {
    id: 'itv-mynet-102',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you handle expired SSL/TLS certificates in production?',
    probing:
      'Whether you find exactly which certificate expired and renew it through the supported controller.',
    answer: [
      "- Use Let's Encrypt + Cert Manager in Kubernetes for auto-renewal.\n- Monitor expiry with alerts.\n- Rotate certificates via CI/CD pipeline before expiration.",
      '**Detailed interview approach:**',
      "First I identify which certificate actually expired — public ingress, an internal service, the API server, kubelet, a webhook, or a client. I check the issuer, SAN, chain, secret, and expiry using `openssl s_client`/`openssl x509` and the relevant controller's status.",
      "For cert-manager, I check the Certificate, CertificateRequest, Order/Challenge, controller logs, whether the DNS/HTTP challenge is reachable, and the issuer's credentials.",
      "I renew or rotate the certificate through the supported controller, reload whatever consumes it, and confirm the full chain and hostname from a real client. Cluster certificates follow the platform's own rotation procedure and node/control-plane sequence.",
      'Alerts at 30/14/7 days out, automated renewal tests, a clear owner inventory, and protected issuer keys are what actually prevent an emergency expiry.',
    ],
    followUps: [
      'How does cert-manager renew a certificate, and where does it fail?',
      'How would you inventory every certificate you own?',
    ],
    tags: ['tls', 'certificates', 'cert-manager'],
  },
]
