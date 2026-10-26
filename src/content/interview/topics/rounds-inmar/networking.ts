import type { InterviewQuestion } from '../../../types'

/** Inmar round: networking fundamentals, DNS and TLS. */
export const roundsInmarNetworkingQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rinm-15',
    level: 'basic',
    kind: 'open',
    prompt: 'What is a subnet?',
    probing:
      'That you can read CIDR notation, size a subnet, and explain why VNets are split into subnets.',
    answer: [
      'A **subnet** is a **smaller range of IP addresses inside a network** (VNet). You split a VNet into subnets to group and isolate resources, just like dividing a building into floors.',
      '**CIDR notation in simple words:** The number after `/` says how many bits are fixed for the network. The **smaller** the number, the **bigger** the range.',
      '- **CIDR**: /16; **Total IPs**: 65,536; **Usable in Azure (minus 5 reserved)**: 65,531\n- **CIDR**: /24; **Total IPs**: 256; **Usable in Azure (minus 5 reserved)**: 251\n- **CIDR**: /26; **Total IPs**: 64; **Usable in Azure (minus 5 reserved)**: 59\n- **CIDR**: /27; **Total IPs**: 32; **Usable in Azure (minus 5 reserved)**: 27\n- **CIDR**: /29; **Total IPs**: 8; **Usable in Azure (minus 5 reserved)**: 3 (smallest allowed in Azure)',
      '**Azure reserves 5 IPs in every subnet:** the network address (`.0`), the default gateway (`.1`), two for Azure DNS (`.2`, `.3`), and the broadcast address (`.255` in a /24).',
      '**Why we use subnets**\n- **Security:** attach an **NSG** to each subnet (only backend can reach data).\n- **Routing:** attach a **route table** (send traffic through Azure Firewall).\n- **Delegation:** some services need their own subnet (App Service VNet integration, Azure Container Instances).\n- **Special subnets** with fixed names: `GatewaySubnet` (VPN/ExpressRoute), `AzureFirewallSubnet`, `AzureBastionSubnet`.',
      '**Create with Azure CLI**',
      '**Real tip:** for AKS with Azure CNI (pod IPs from the subnet), size the subnet generously. A /24 runs out quickly when every pod takes an IP.',
      '**Interview answer:** "A subnet is a smaller IP range inside a VNet that groups related resources. For example, in a 10.10.0.0/16 VNet, I create separate /24 subnets for the frontend, backend, and data tiers, attach NSGs to control traffic between them, and route tables to send traffic through the firewall. Azure reserves 5 IPs in every subnet, so a /24 gives 251 usable IPs. I size subnets based on growth, especially for AKS, where pods can consume subnet IPs."',
    ],
    code: [
      {
        title: 'VNet and subnet layout example',
        language: 'text',
        code: `VNet: vnet-app-prod   10.10.0.0/16   (65,536 addresses)
 |
 +-- snet-frontend     10.10.1.0/24   (256 addresses) -> App Gateway
 +-- snet-backend      10.10.2.0/24   (256 addresses) -> AKS nodes
 +-- snet-data         10.10.3.0/24   (256 addresses) -> private endpoints for SQL, Key Vault`,
      },
      {
        title: 'Create a subnet with Azure CLI',
        language: 'bash',
        code: `az network vnet subnet create \\
  -g rg-network \\
  --vnet-name vnet-app-prod \\
  -n snet-backend \\
  --address-prefixes 10.10.2.0/24`,
      },
    ],
    tags: ['networking', 'subnet', 'cidr', 'vnet', 'azure'],
  },
  {
    id: 'itv-rinm-16',
    level: 'basic',
    kind: 'open',
    prompt: 'What are protocols and their types? What are ports (443, 80)? What is DNS?',
    probing:
      'Networking fundamentals: TCP versus UDP, well-known ports, why 443 over 80, and how DNS resolution and record types work.',
    answer: [
      '**Protocol:** A **protocol** is a set of rules that two systems follow to communicate, like a common language.',
      '**Transport protocols** (how data is delivered):\n- **Protocol**: **TCP**; **How it works**: Connection-based, reliable, ordered; resends lost data; **Used by**: HTTP/HTTPS, SSH, databases\n- **Protocol**: **UDP**; **How it works**: No connection, faster, no delivery guarantee; **Used by**: DNS queries, video streaming, VoIP\n- **Protocol**: **ICMP**; **How it works**: Network diagnostics, no ports; **Used by**: `ping`, `traceroute`',
      '**Application protocols** (what the data means): HTTP, HTTPS, SSH, FTP/SFTP, SMTP, DNS, RDP.',
      '**Port:** An IP address finds the **machine**; a **port** finds the **application** on that machine. Example: one VM runs Nginx on port 80 and SSH on port 22. Ports go from 0 to 65535.',
      '- **Port**: **80**; **Protocol**: HTTP; **Use**: Web traffic, **not encrypted**\n- **Port**: **443**; **Protocol**: HTTPS; **Use**: Web traffic **encrypted with TLS**\n- **Port**: 22; **Protocol**: SSH; **Use**: Linux remote login\n- **Port**: 3389; **Protocol**: RDP; **Use**: Windows remote desktop\n- **Port**: 53; **Protocol**: DNS; **Use**: Name resolution (UDP, and TCP for large responses)\n- **Port**: 25 / 587; **Protocol**: SMTP; **Use**: Sending email\n- **Port**: 1433; **Protocol**: SQL Server / Azure SQL; **Use**: Database\n- **Port**: 3306; **Protocol**: MySQL; **Use**: Database\n- **Port**: 5432; **Protocol**: PostgreSQL; **Use**: Database\n- **Port**: 6379; **Protocol**: Redis; **Use**: Cache\n- **Port**: 6443; **Protocol**: Kubernetes API (default); **Use**: AKS exposes the API server on 443',
      '**80 vs 443:** on port 80, anyone in the middle can read the traffic (passwords, cookies). On 443, TLS encrypts it. In production, we redirect 80 → 443 and allow only 443 from the internet.',
      '**DNS:** **DNS (Domain Name System)** translates names into IP addresses, like a phone book: `www.example.com` → `20.81.45.120`.',
      'Common record types:\n- **Record**: A; **Purpose**: Name → IPv4 address; **Example**: `app.example.com → 20.81.45.120`\n- **Record**: AAAA; **Purpose**: Name → IPv6 address\n- **Record**: CNAME; **Purpose**: Name → another name; **Example**: `www → app.example.com`\n- **Record**: MX; **Purpose**: Mail server for the domain\n- **Record**: TXT; **Purpose**: Text, used for domain verification, SPF\n- **Record**: NS; **Purpose**: Name servers for the zone\n- **Record**: PTR; **Purpose**: IP → name (reverse lookup)',
      '**In Azure:** Azure DNS hosts public zones, and **Private DNS zones** resolve private endpoint names (for example `mykv.privatelink.vaultcore.azure.net` → `10.10.3.5`) inside VNets.',
      '**Troubleshooting commands:**',
      '**Interview answer:** "A protocol is a set of communication rules. TCP is reliable and connection-based, used for HTTP, SSH, and databases; UDP is faster with no delivery guarantee, used for DNS queries and streaming. A port identifies the application on a host: 80 is HTTP, which is unencrypted, and 443 is HTTPS, which is encrypted with TLS, so in production we only expose 443 and redirect 80 to it. DNS translates names to IPs using records like A, CNAME, and TXT. In Azure, I use Private DNS zones so private endpoint names resolve to private IPs. For troubleshooting, I check DNS with `nslookup` first and then the port with `nc`."',
    ],
    code: [
      {
        title: 'How a DNS lookup works',
        language: 'text',
        code: `Browser: "what is the IP of app.example.com?"
   |
   v
Local cache / OS resolver
   |
   v
DNS resolver (ISP or Azure DNS 168.63.129.16)
   |
   +--> Root server      -> "ask the .com servers"
   +--> .com server      -> "ask example.com's name servers"
   +--> example.com NS   -> "app.example.com = 20.81.45.120"
   |
   v
Answer cached for the TTL (for example 300 seconds)`,
      },
      {
        title: 'DNS and port troubleshooting commands',
        language: 'bash',
        code: `nslookup app.example.com
dig app.example.com +short
nc -zv app.example.com 443      # is the port open?`,
      },
    ],
    tags: ['networking', 'protocols', 'ports', 'dns', 'tcp'],
  },
  {
    id: 'itv-rinm-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are TLS and certificates, and how do we use them?',
    probing:
      'What TLS provides, what is inside a certificate, the handshake at a high level, and how you issue, store and renew certificates in real projects.',
    answer: [
      '**TLS (Transport Layer Security)** encrypts data **in transit** between a client and a server. HTTPS is simply HTTP over TLS. (SSL is the old name; SSL itself is deprecated.)',
      'TLS gives three things:\n1. **Encryption:** nobody in the middle can read the data.\n2. **Authentication:** the client knows it is really talking to `app.example.com`, not a fake server.\n3. **Integrity:** data cannot be changed in transit without being detected.',
      "**Certificate:** A **certificate** is a digital ID card for a server. It contains:\n- The **domain name** (for example `app.example.com`, or `*.example.com` for a wildcard).\n- The server's **public key**.\n- The **issuer** (Certificate Authority, such as DigiCert or Let's Encrypt) and its signature.\n- **Validity dates** (expiry).",
      'The matching **private key** stays secret on the server. The browser trusts the certificate because a CA it already trusts signed it.',
      '**Simplified TLS handshake**',
      '**mTLS (mutual TLS):** both sides present certificates. Used between microservices (service mesh) or for partner APIs.',
      "**How we use them in projects**\n- **Where**: AKS Ingress; **How**: **cert-manager** gets free Let's Encrypt certificates and renews them automatically\n- **Where**: Application Gateway; **How**: Certificate stored in **Key Vault**, referenced by the listener; App Gateway auto-picks renewed versions\n- **Where**: App Service; **How**: Custom domain + App Service managed certificate or Key Vault certificate\n- **Where**: Service-to-service; **How**: mTLS through Istio\n- **Where**: Kubernetes itself; **How**: The API server, kubelets, and etcd use certificates internally (managed by AKS; rotate with `az aks rotate-certs`)",
      "**Example: cert-manager with Let's Encrypt on AKS**",
      'cert-manager requests the certificate, stores it in the `app-example-tls` Secret, and renews it before expiry.',
      '**Checking a certificate**',
      '**Real issue to mention:** expired certificates cause outages. Automate renewal (cert-manager, Key Vault auto-renewal) and set alerts 30 days before expiry.',
      '**Interview answer:** "TLS encrypts traffic in transit and proves the server\'s identity using a certificate. The certificate contains the domain name, the public key, the issuing CA, and the expiry date, and the private key stays on the server. In AKS, I use cert-manager with Let\'s Encrypt on the Ingress so certificates are issued and renewed automatically. For Application Gateway, I store certificates in Key Vault. Between microservices, we can use mTLS through a service mesh. I also monitor certificate expiry, because an expired certificate is a common cause of outages."',
    ],
    code: [
      {
        title: 'Simplified TLS handshake',
        language: 'text',
        code: `Client                                   Server
  | --- Hello (TLS versions, ciphers) ---> |
  | <-- Certificate (public key) --------- |
  | checks: trusted CA? correct domain?    |
  |         not expired?                   |
  | --- key exchange --------------------> |
  | <====== encrypted session (HTTPS) ===> |`,
      },
      {
        title: 'cert-manager ClusterIssuer and Ingress',
        language: 'yaml',
        code: `apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops-team@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend
  namespace: prod
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-example-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80`,
      },
      {
        title: 'Use an existing certificate manually',
        language: 'bash',
        code: `kubectl create secret tls app-example-tls \\
  --cert=app.example.com.crt --key=app.example.com.key -n prod`,
      },
      {
        title: 'Check a certificate with openssl',
        language: 'bash',
        code: `openssl s_client -connect app.example.com:443 -servername app.example.com </dev/null \\
  | openssl x509 -noout -subject -issuer -dates`,
      },
    ],
    tags: ['networking', 'tls', 'certificates', 'cert-manager', 'security'],
  },
]
