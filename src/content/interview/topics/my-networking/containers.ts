import type { InterviewQuestion } from '../../../types'

/** Docker and Kubernetes networking: Services, Ingress, DNS, NetworkPolicy and troubleshooting. */
export const myNetworkingContainerQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mynet-27',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between `EXPOSE` in a Dockerfile and `-p` in `docker run`?',
    probing:
      'Whether you know that `EXPOSE` only documents a port and publishing is what makes it reachable from the host.',
    answer: [
      '`EXPOSE 80` documents that the application expects traffic on container port 80.',
      'It does not publish the port to the host. The application must also be configured to listen on that port.',
      'The container runs, but the host cannot reach its port directly because no host port was published.',
      '`-p 8080:80` maps host port 8080 to container port 80.',
      'Open `http://localhost:8080` to reach the application.',
      'Think of it like this:',
      '- **`EXPOSE`:** The restaurant has a door at a known location.\n- **`-p`:** The host opens a route that customers can use to reach that door.',
    ],
    code: [
      {
        title: 'Build and run without publishing',
        language: 'bash',
        code: `docker build -t mynginx .
docker run mynginx`,
      },
      {
        title: 'Publish host port 8080 to container port 80',
        language: 'bash',
        code: `docker run -p 8080:80 mynginx`,
      },
    ],
    tags: ['docker', 'ports'],
  },
  {
    id: 'itv-mynet-28',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you run NGINX on a Linux server using Docker?',
    probing:
      'Whether you can run a pinned NGINX image with port mapping and a content volume, and remember the firewall.',
    answer: [
      'This downloads a specific NGINX image version from Docker Hub.',
      '- `-d` → Runs the container in detached mode (in the background).\n- `-p 80:80` → Maps port 80 of the container to port 80 on the host.\n- `--name mynginx` → Assigns a name to your container for easy reference.\n- `nginx:1.27-alpine` → The image and version to run.',
      'Open `http://<your-server-public-ip>` to see the NGINX welcome page. The server firewall or cloud security rule must allow inbound port 80.',
      "The container listens on port 80, and Docker maps it to host port 8080. The `-v` option mounts the host's website directory into NGINX's default content directory.",
      'Open `http://<your-server-ip>:8080` to view the website.',
    ],
    code: [
      {
        title: 'Pull a pinned NGINX image',
        language: 'bash',
        code: `docker pull nginx:1.27-alpine`,
      },
      {
        title: 'Run NGINX on port 80',
        language: 'bash',
        code: `docker run -d -p 80:80 --name mynginx nginx:1.27-alpine`,
      },
      {
        title: 'Serve a local website on port 8080',
        language: 'bash',
        code: `docker run -d -p 8080:80 --name web \\
  -v /home/ubuntu/website:/usr/share/nginx/html \\
  nginx:1.27-alpine`,
      },
    ],
    tags: ['docker', 'nginx'],
  },
  {
    id: 'itv-mynet-29',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How does Docker networking work, and which network drivers would you use?',
    probing:
      'Whether you know the drivers and why a user-defined bridge with name resolution beats the default bridge.',
    answer: [
      "Docker networking connects containers to each other, to the host, and to the outside world, while still keeping them isolated. On a typical Linux host, Docker creates a bridge interface called `docker0`. Containers get an address on that bridge's subnet, and outbound traffic normally goes through the host's NAT rules (`iptables` or `nftables`).",
      '**Network Drivers**, at a glance:',
      "- **`bridge`**: Single-host container networking. Prefer a user-defined bridge over the default one — it gives you proper isolation and lets containers find each other by name.\n- **`host`**: Shares the host's own network stack directly. No port mapping, and almost no isolation. Only use this when you have a specific, measured reason to.\n- **`none`**: No real network interface beyond loopback. Useful when a container should be fully isolated from the network.\n- **`overlay`**: Multi-host networking, used with Docker Swarm.\n- **`macvlan`**: Gives a container its own MAC address and IP on the physical network. Needs sign-off from the network team, and has some quirks around host-to-container communication.\n- **`ipvlan`**: Similar to macvlan — connects containers at layer 2/3 — but handles MAC addresses differently and scales differently.",
      '`EXPOSE 80` in a Dockerfile just documents which port the app uses. To actually reach it from outside the container, you publish it:',
      "This maps host port `8080` to container port `80`. Containers on the same user-defined network can reach each other by name — for example, `mysql:3306` — so avoid hardcoding a container's IP address anywhere in configuration; it can change.",
      '**Best practices and troubleshooting**',
      'Give each application (or trust boundary) its own network. Publish only the ports you actually need, on the interfaces you intend. Avoid `--network host` unless you have a real reason. Use DNS names instead of IPs. Restrict inbound and outbound traffic with host or cloud firewall policy. Keep an eye on network and NAT connection capacity.',
      "When troubleshooting, work through: `docker inspect` on the container, its network namespace routes and listening ports, Docker's DNS, the host firewall and NAT rules, port mappings, and — if needed — a packet capture on both the host and container side.",
    ],
    code: [
      {
        title: 'Publish a container port',
        language: 'bash',
        code: `docker run -p 8080:80 image`,
      },
    ],
    tags: ['docker', 'networking', 'drivers'],
  },
  {
    id: 'itv-mynet-30',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot container DNS resolution failures?',
    probing:
      'Whether you scope the failure and check the container resolver, Docker embedded DNS and upstream DNS before hardcoding anything.',
    answer: [
      "First I figure out the scope: is it one container, one network, the whole host, or every destination? Inside the container, I check `/etc/resolv.conf`, run `getent hosts`, look at the application's own error, and test whether connecting by IP works even when connecting by name doesn't.",
      "On the host, I check the Docker network, Docker's embedded DNS server (`127.0.0.11`), the upstream DNS server, routes and firewall rules, any VPN, and the daemon logs.",
      'I also check the search domain, the DNS record type, whether a stale cache (TTL) is the culprit, and which network the container is actually attached to. I avoid "fixing" this by hardcoding an IP address — that just hides the real problem. Once I fix it, I re-test both the intended hostname and an external one, and keep an eye out for it recurring.',
    ],
    code: [
      {
        title: 'Inspect container DNS',
        language: 'bash',
        code: `docker exec app cat /etc/resolv.conf
docker exec app getent hosts db.internal
docker network inspect appnet`,
      },
    ],
    tags: ['docker', 'dns', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-31',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What strategies do you use for debugging container networking issues?',
    probing:
      'Whether you follow the packet path from the app binding to the remote service and know the usual culprits.',
    answer: [
      "I follow the path a packet actually takes: the app binding to a port inside the container → the container's own network namespace and IP → Docker's bridge or overlay network → the host's routes, NAT, and firewall → the remote service or load balancer.",
      "Along the way I check `docker ps` and its port mappings, `docker inspect`, the networks involved, what's actually listening, DNS, routes, firewall rules, and — when it's approved — a packet capture. I test both from inside the source container and from the host, to narrow down which layer is broken.",
      "The usual culprits: the app is bound to `localhost` instead of `0.0.0.0`, the wrong host port was published, the containers are on different networks, DNS isn't resolving, the host firewall is blocking traffic, two networks have overlapping IP ranges, MTU is misconfigured, or a proxy is in the way. I make the smallest fix that addresses the real cause, re-test in both directions, confirm the app is healthy, and write the working network configuration down so it doesn't get lost.",
    ],
    tags: ['docker', 'networking', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-32',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain `port`, `targetPort` and `nodePort` in Kubernetes.',
    probing:
      'Whether you can follow a request from the node port through the Service port to the container port.',
    answer: [
      'In Kubernetes, `port` is the port a Service exposes inside the cluster. `targetPort` is the port on the container that traffic actually gets sent to. `nodePort` is the port opened on each worker node so the service can be reached from outside the cluster.',
      'Example: request → `nodePort` (30080) → service `port` (80) → container `targetPort` (8080).',
      "- **`port`:** The port where the Service is exposed inside the cluster. Other pods reach the service through this port.\n- **`targetPort`:** The port on the pod's container that the service forwards traffic to. This is where the application actually listens.\n- **`nodePort`:** A port opened on every worker node. It lets you reach the service from outside the cluster using `<node-ip>:<nodePort>`.",
      '**NodePort range (by default):** `30000–32767`.',
    ],
    code: [
      {
        title: 'NodePort Service',
        language: 'yaml',
        code: `apiVersion: v1
kind: Service
metadata:
  name: my-web-service
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
  - port: 80           # Service port (cluster-internal)
    targetPort: 8080   # Pod port (container)
    nodePort: 30080    # Node port (external)`,
      },
    ],
    tags: ['kubernetes', 'services', 'ports'],
  },
  {
    id: 'itv-mynet-33',
    level: 'basic',
    kind: 'open',
    prompt: 'What is port forwarding in Kubernetes?',
    probing:
      'Whether you know how `kubectl port-forward` works, what it is for and its limitations.',
    answer: [
      "Port forwarding lets you reach a single pod directly from your local machine. You forward a port on your machine to a port on the pod. It's mainly used for debugging or for reaching an app inside a pod without setting up a full service.",
      'This forwards local port `8080` to port `80` on the pod named `my-pod`.',
      'You can then reach the app by opening `http://localhost:8080` in a browser, or by using `curl`.',
      '**Use cases** for port forwarding:',
      '- **Debugging:** Look at logs or interfaces running inside a pod.\n- **Testing:** Try out a service without exposing it externally.\n- **Accessing Databases:** Connect to a database running in a pod to manage it or run queries.',
      '**Limitations** to keep in mind:',
      '- Port forwarding only lasts as long as the `kubectl` command keeps running.\n- It works only against pods, not directly against services or deployments.\n- You need `kubectl` access to the cluster and permission to reach the pod.',
      '**Example command** against a deployment:',
      'This forwards local port `9090` to port `80` on the pods managed by the `my-app` deployment.',
      'You can now reach the app at `http://localhost:9090`.',
    ],
    code: [
      {
        title: 'Port-forward syntax',
        language: 'bash',
        code: `kubectl port-forward <pod-name> <local-port>:<pod-port>`,
      },
      {
        title: 'Forward local 8080 to a pod',
        language: 'bash',
        code: `kubectl port-forward my-pod 8080:80`,
      },
      {
        title: 'Forward local 9090 to a deployment',
        language: 'bash',
        code: `kubectl port-forward deployment/my-app 9090:80`,
      },
    ],
    tags: ['kubernetes', 'kubectl', 'port-forward'],
  },
  {
    id: 'itv-mynet-34',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the Kubernetes Service types, and when do you use Ingress instead?',
    probing:
      'Whether you know ClusterIP, NodePort, LoadBalancer, ExternalName and headless Services, and where Ingress fits.',
    answer: [
      '- **ClusterIP:** A stable internal IP. This is the default Service type.\n- **NodePort:** Opens a port on every node and forwards it to the Service.\n- **LoadBalancer:** Asks the cloud provider for an external or internal load balancer.\n- **ExternalName:** Returns a configured external DNS name.\n- **Headless Service:** Uses `clusterIP: None` so clients can discover endpoints directly.',
      "`port` is the Service's own port. `targetPort` is the port on the destination pod. `nodePort` is the optional port exposed on cluster nodes.",
      '**Service Types and External Access**',
      'A Service gives a changing set of pods one stable virtual IP and DNS name, and load-balances traffic to whichever pods are ready, based on label selectors.',
      "- `ClusterIP`: an internal-only virtual IP, and the default type.\n- `NodePort`: opens a fixed port on every node and forwards it to the Service. Useful for specific integrations or for learning, but exposing nodes directly is rarely the right choice in production.\n- `LoadBalancer`: asks the cloud integration to provision or attach an external or internal load balancer to the Service.\n- `ExternalName`: returns a DNS CNAME. It doesn't proxy traffic or do any health checking.",
      'Ingress is an HTTP/HTTPS routing API. It needs an Ingress controller such as **NGINX**, **Traefik**, or a cloud-provided controller to actually work. It can bring host/path routing and TLS for many Services together in one place.',
      "Use a LoadBalancer Service for one application or one Layer-4 protocol. Use Ingress when you need shared Layer-7 routing across several Services. When something's wrong, check the controller class, listener, certificate/SNI, host/path rules, Service port, EndpointSlice, readiness, health probes, and network policy.",
      '**Ingress and DNS**: Ingress defines HTTP/HTTPS routing rules and needs an Ingress controller to work. CoreDNS provides DNS inside the cluster.',
      'When routing breaks, troubleshoot from the inside out: pod readiness, endpoint slices, Service selectors and ports, DNS, Ingress rules/controller, then the load balancer and firewall.',
    ],
    tags: ['kubernetes', 'services', 'ingress'],
  },
  {
    id: 'itv-mynet-35',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you restrict pod-to-pod communication in a Kubernetes cluster?',
    probing:
      'Whether you know NetworkPolicy needs an enforcing CNI and can write and test a label-based allow rule.',
    answer: [
      'To restrict pod-to-pod traffic in a cluster, use **Network Policies**. A Network Policy is a rule that controls which pods can talk to which, based on labels, namespaces, and ports.',
      "Here's how to set one up:",
      "1. **Check that your CNI supports Network Policies.** Your cluster's network plugin needs to enforce them — for example Calico, Cilium, or Weave.\n2. **Write the policy.** Create a Network Policy YAML file that spells out the allowed traffic. Here's an example that only lets frontend pods reach backend pods (see the policy below). Here, only pods labeled `role: frontend` can reach pods labeled `role: backend`, and only on port 80.\n3. **Apply the policy:**\n4. **Test it.** Confirm that allowed pod-to-pod traffic still works, and that traffic that should be blocked actually is.\n5. **Add more policies as needed.** Different pods and namespaces will need their own rules.\n6. **Keep reviewing your policies.** Check that they still match how the application works, and update them as the architecture changes.",
      'Network Policies are the main tool for restricting pod-to-pod traffic. Used well, they improve security and give you clear control over how traffic flows between parts of your application.',
      '**NetworkPolicy rules to remember**',
      '`NetworkPolicy` restricts what traffic a pod can send or receive, as long as the CNI plugin supports it.',
      '- With no policy selecting a pod, all traffic is allowed by default.\n- A policy isolates a pod only in the directions listed in `policyTypes`, or implied by its rules.\n- To block all egress from a pod, select it, include `Egress` in `policyTypes`, and add no allowed egress rules.',
      'Best practice: start with default-deny policies, then add explicit allows for DNS and whatever application traffic is actually needed.',
    ],
    code: [
      {
        title: 'Allow frontend to backend on port 80',
        language: 'yaml',
        code: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: default
spec:
  podSelector:
    matchLabels:
      role: backend         # Target backend pods
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend    # Allow only frontend pods
    ports:
    - protocol: TCP
      port: 80`,
      },
      {
        title: 'Apply the policy',
        language: 'bash',
        code: `kubectl apply -f network-policy.yaml`,
      },
    ],
    tags: ['kubernetes', 'networkpolicy', 'security'],
  },
  {
    id: 'itv-mynet-36',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'Your Ingress controller crashes repeatedly under heavy load. How do you stabilize it?',
    probing:
      'Whether you protect traffic first and then find the real cause of controller crashes under load.',
    answer: [
      'First I protect traffic: roll back the last config change, scale up healthy replicas, or shift traffic away. Then I look for the cause. I check current and previous logs, whether pods were OOM-killed or terminated, CPU/memory and throttling, connection and request metrics, how often the config reloads, TLS/WAF/logging overhead, upstream latency, node pressure, and load-balancer health.',
      'Fixes usually involve: running multiple replicas spread across zones, a PodDisruptionBudget, realistic resource requests, autoscaling on CPU/requests/connections, dedicated nodes if needed, a leaner config, and a slower reload rate. A large cert or rule set, or too much access logging/tracing, can also overload the controller. A slow backend can pile up connections and cause the same symptom.',
      "I load-test at peak plus a failure scenario, check p95 latency, error rate, connection resets, and reload metrics, then plan capacity ahead of time and validate config changes with a canary. Scaling the controller alone won't help if the real problem is a saturated backend.",
    ],
    followUps: [
      'How would you autoscale the ingress controller, and on which metric?',
      'How do you tell a controller problem from a saturated backend?',
    ],
    tags: ['kubernetes', 'ingress', 'scaling'],
  },
  {
    id: 'itv-mynet-37',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'During peak traffic, Ingress fails to route requests efficiently. How do you diagnose and scale it?',
    probing:
      'Whether you split the request path into stages and use evidence before tuning buffers and timeouts.',
    answer: [
      'I split the request path into stages: edge/load balancer, Ingress controller, Service/endpoints, and backend. I compare request rate, 4xx/5xx counts, controller latency versus upstream latency, active connections and queue depth, TLS overhead, retries and timeouts, reload frequency, pod/node resource use, readiness, and endpoint count.',
      'I check the routing rule (host and path) and test the Service directly, bypassing Ingress, to isolate the problem. Depending on what I find, the fix might be scaling the controller or backends, adding capacity headroom, rolling back a recent config change, rate limiting, or shifting traffic elsewhere.',
      'I only tune buffers and timeouts once the evidence points there — a timeout set too long just makes connection exhaustion worse.',
      'Afterward I load-test, set up autoscaling with zone spreading and a PodDisruptionBudget, and monitor saturation — how close a resource is to running out of capacity. I also confirm the cloud load balancer is spreading traffic across healthy controller pods and nodes, and add synthetic tests for the key host/path combinations.',
    ],
    followUps: [
      'Which metrics show the controller, not the backend, is the bottleneck?',
      'What would you check first if the fix did not hold and the problem came back?',
    ],
    tags: ['kubernetes', 'ingress', 'performance'],
  },
  {
    id: 'itv-mynet-38',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot 503 errors from a LoadBalancer?',
    probing:
      'Whether you find which layer produced the 503 and check selectors, endpoints and readiness in order.',
    answer: [
      'A 503 usually means the request reached the gateway or load balancer, but there was no healthy backend, or the upstream failed. I check the headers and logs to see which layer generated the response.',
      'Then I check load balancer provisioning and backend health, the Service selector and ports, EndpointSlices, pod readiness, whether the app is listening on the right address and port, the Ingress route, and the network/firewall path.',
      "I test in order: the pod IP directly, then the Service DNS name, then the Ingress/load balancer. I fix whatever's broken — selector, port, probe, network, or app — or roll back the release, then confirm the fix with a real external request and by watching metrics. To prevent a repeat, I add smoke/synthetic tests, config validation, and an alert on healthy backend count.",
      '**Troubleshooting order for network and 503 failures**',
      'When you see a network failure or a 503, check in this order: pod readiness, Service selectors, endpoint slices, `port`/`targetPort`, DNS, NetworkPolicies, Ingress controller logs, health probes, load balancer rules, routes, and firewalls.',
    ],
    code: [
      {
        title: 'Inspect the Service path',
        language: 'bash',
        code: `kubectl get svc,endpointslice,pods -o wide
kubectl describe svc <svc>
kubectl logs <ingress-controller> --since=15m`,
      },
    ],
    tags: ['kubernetes', '503', 'load balancer'],
  },
  {
    id: 'itv-mynet-39',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A pod is not accessible internally. How do you troubleshoot it?',
    probing:
      'Whether you test DNS, Service and pod IP separately and read the exact error to find the broken layer.',
    answer: [
      'First I clarify what "not accessible" means: by pod IP or by Service, and from which namespace. I check that the pod is Running and Ready, that the app logs show it listening on `0.0.0.0:<targetPort>` (not just `localhost`), that the Service selector, port, and targetPort match, and that EndpointSlices and DNS look correct.',
      "From a debug pod, I test in order: DNS, then Service IP/port, then the pod IP/port directly. If the direct pod IP works but the Service doesn't, the problem is likely the selector, endpoints, or the Service data plane.",
      'If both fail, I check how the app is bound, NetworkPolicy rules, and the CNI/routes/security group/node firewall. If only DNS fails, I check CoreDNS and any DNS-related policy.',
      "I note the exact error — timeout, connection refused, or NXDOMAIN — fix the one layer that's broken, and retest from the original source plus readiness and the real user flow. I clean up any debug pods afterward.",
    ],
    tags: ['kubernetes', 'services', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-40',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A pod is accessible internally but the LoadBalancer fails. What do you check?',
    probing:
      'Whether you know cloud load balancer probes, `externalTrafficPolicy` and provider logs.',
    answer: [
      "Since internal access works, the pod and app are at least partly healthy. I check the LoadBalancer Service's events, status, and external address, the cloud load balancer's backend/target health, the probe's path/port/protocol/host, the Service's `port`/`targetPort`/`nodePort`, `externalTrafficPolicy`, node and pod readiness, and the cloud security group/firewall/routes.",
      'I test the Service from inside the cluster, the health endpoint the way the load balancer sees it, and the external path. Controller and cloud-provider logs, plus cloud activity logs, usually reveal provisioning, permission, or quota errors.',
      'One thing to watch for: if `externalTrafficPolicy` is set to `Local`, a node with no local endpoints for that Service can fail its health check, even though other nodes are fine.',
      "I fix the probe, network, ports, or annotation — or roll back — then wait for the change to reconcile (for the cluster's actual state to catch up with the desired state). I confirm multiple zones and backends work, check external TLS and requests, and monitor going forward. I never open the firewall wider as a permanent workaround.",
    ],
    followUps: [
      'What changes when `externalTrafficPolicy` is `Local`?',
      'Where would you find cloud-provider provisioning errors?',
    ],
    tags: ['kubernetes', 'load balancer', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-41',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you debug DNS failures inside Kubernetes?',
    probing:
      'Whether you can narrow a DNS failure by name type, scope and error, and know CoreDNS, `ndots` and policy pitfalls.',
    answer: [
      'First I narrow down the failure: is it a cluster Service name or an external name, one pod/node/namespace or the whole cluster, and is it NXDOMAIN or a timeout? From a debug pod I check `/etc/resolv.conf`, run `nslookup`/`dig` for both the short name and the FQDN, and query the kube-dns Service IP directly.',
      "I check CoreDNS's replica count, readiness, logs, metrics, and config, the relevant Service/endpoints, NetworkPolicy rules for UDP/TCP port 53, the CNI, and the upstream resolver or node DNS.",
      'High latency is often caused by `ndots` search-domain amplification, an overloaded CoreDNS, or a slow upstream resolver. I fix this by scaling or fixing CoreDNS, or reverting a bad config change — never by hardcoding entries in `/etc/hosts`.',
      "Afterward I confirm both internal Service names and external names resolve, check TCP fallback for large responses, and monitor DNS error rate and latency. NodeLocal DNSCache can help at scale, but only after the data shows it's actually needed.",
    ],
    followUps: [
      'How does `ndots` cause extra DNS lookups?',
      'When would you add NodeLocal DNSCache?',
    ],
    tags: ['kubernetes', 'dns', 'coredns'],
  },
  {
    id: 'itv-mynet-42',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you troubleshoot Pod-to-Pod networking issues?',
    probing:
      'Whether you test same-node vs cross-node and direct IP vs Service to isolate CNI, policy or Service problems.',
    answer: [
      'I map out the source pod, destination pod, their nodes, IPs, port/protocol, and the exact failure. I test the direct pod IP first — same node, then across nodes — then the Service, using `nc`/`curl`, and only use packet capture with approval.',
      'I check that the app is actually listening, both ingress and egress NetworkPolicy rules (including namespace labels), CNI pod status/logs/IP allocation, node routes/MTU/firewall/security groups, and kube-proxy or eBPF data-plane state.',
      "If same-node traffic works but cross-node traffic fails, suspect the CNI overlay, routes, MTU, or firewall. If the direct IP works but the Service doesn't, suspect endpoints or the Service data plane. Whether it's a timeout or an outright refusal is also a useful clue.",
      'After the fix, I confirm the traffic that should be allowed works and the traffic that should be blocked stays blocked, test across multiple nodes and zones, and monitor for packet drops. I keep the network config in version control.',
    ],
    followUps: [
      'What does an MTU mismatch look like on an overlay network?',
      'How would you capture packets safely on a node?',
    ],
    tags: ['kubernetes', 'cni', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-43',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you design and debug NetworkPolicies between namespaces?',
    probing:
      'Whether you design policies from real flows, roll out default-deny safely and debug without deleting everything.',
    answer: [
      "I start by listing out the traffic flows that need to exist, then confirm the CNI actually enforces NetworkPolicy, and make sure namespaces are labeled reliably. I apply a default-deny rule for ingress and egress first, then add explicit allows for DNS and the application traffic that's actually needed. A single rule can combine a `namespaceSelector` and a `podSelector` to require both conditions.",
      'I roll this out through an audit or staging mode where the tooling supports it, run connectivity tests from both allowed and denied namespaces, and check policy selection (the `podSelector` labels), `policyTypes`, ports/protocols, namespace labels, return traffic, and DNS.',
      'When something fails, I compare against a direct-IP test, check which policies select the source and destination, and look at CNI policy logs or drop counters. I don\'t delete all policies to "fix" it — if I need a temporary diagnostic allow rule, I keep it narrow and time-boxed, with approval.',
      "I validate that the result gives least privilege — only the access that's actually needed — while still letting required health checks and monitoring traffic through.",
    ],
    followUps: [
      'How do you allow DNS egress in a default-deny namespace?',
      'How do you protect namespace labels used in policies?',
    ],
    tags: ['kubernetes', 'networkpolicy', 'namespaces'],
  },
  {
    id: 'itv-mynet-44',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you restrict communication between two Pods in the same namespace?',
    probing:
      'Whether you can write an ingress policy for one source label and port and remember egress rules.',
    answer: [
      "Without any policy, pods can generally reach each other freely. I label the workloads, apply a default-deny rule, then allow the target to receive traffic only from the approved source label and port. If egress is also isolated, the source's egress rule needs to allow the destination too.",
      "I confirm the CNI actually enforces this, then test that the API can reach the database, an unrelated pod cannot, and DNS/monitoring still work. Labels are a security-relevant input, so I make sure they're protected by admission control or governance. I monitor denied flows where that's supported, and keep policies in version control.",
    ],
    code: [
      {
        title: 'Allow only the API to reach the database',
        language: 'yaml',
        code: `spec:
  podSelector: { matchLabels: { app: database } }
  policyTypes: [Ingress]
  ingress:
  - from:
    - podSelector: { matchLabels: { app: api } }
    ports: [{ protocol: TCP, port: 5432 }]`,
      },
    ],
    tags: ['kubernetes', 'networkpolicy'],
  },
  {
    id: 'itv-mynet-45',
    level: 'advanced',
    kind: 'open',
    prompt:
      'How would you connect a Kubernetes microservice to an external database through a VPN with high availability and security?',
    probing:
      'Whether you can design redundant hybrid connectivity plus identity, TLS and failure testing end to end.',
    answer: [
      "I design redundant site-to-site VPN tunnels and gateways with BGP routing, non-overlapping CIDRs, private DNS forwarding, and a firewall that only allows the app's subnets/pods to reach the database port.",
      "The workload validates the database's TLS certificate, authenticates with a managed or workload identity (or a rotated secret if that's not possible), uses a least-privilege database account (one with only the access it actually needs), and connects through a pool with timeouts, retries, and a circuit breaker. NetworkPolicy restricts egress to just the database path.",
      'Pods and egress gateways run across multiple zones. The database endpoint, its replicas, and the VPN failover setup all need to match the recovery-time target. I test DNS, routing, and TCP/TLS from a debug pod, run an actual application query, and simulate one tunnel failing and one zone failing, while watching latency, errors, and connection counts.',
      'I make sure logs exist at the app, VPN/firewall, and database layers. I avoid retry storms, account for the extra latency of a cross-network path, and make sure secrets never show up in a manifest or log.',
    ],
    followUps: [
      'How would you test a tunnel failure without an outage?',
      'How do you avoid retry storms when the link degrades?',
    ],
    tags: ['kubernetes', 'vpn', 'database', 'ha'],
  },
  {
    id: 'itv-mynet-46',
    level: 'intermediate',
    kind: 'open',
    prompt: 'You need TCP and UDP on the same port. How do you configure it?',
    probing:
      'Whether you know Services can expose the same port on two protocols and the load balancer caveats.',
    answer: [
      'Define two Service ports with the same number but different protocols and unique names, as long as your cloud load balancer supports this:',
      "A container can bind the same numeric port for TCP and UDP because they're separate sockets under the hood. A standard HTTP Ingress isn't built for generic UDP traffic, so use a LoadBalancer Service or a Gateway/controller that explicitly supports both protocols.",
      "I confirm how the cloud provider handles health checks for this setup, check the firewall/security group covers both protocols, verify endpoints, and test with `dig` over both UDP and TCP. Passing on one protocol doesn't mean the other one works too.",
    ],
    code: [
      {
        title: 'TCP and UDP on port 53',
        language: 'yaml',
        code: `ports:
- name: dns-tcp
  port: 53
  targetPort: 53
  protocol: TCP
- name: dns-udp
  port: 53
  targetPort: 53
  protocol: UDP`,
      },
    ],
    tags: ['kubernetes', 'services', 'udp'],
  },
  {
    id: 'itv-mynet-47',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What happens if the firewall between control plane and worker nodes breaks?',
    probing:
      'Whether you understand node heartbeats, eviction, fencing risk and how to restore only the required rules.',
    answer: [
      "Nodes can no longer send heartbeats or watch for pod spec changes, so they go NotReady or Unreachable. Containers that are already running may keep running locally, but the control plane can't reliably manage them — `exec`, `logs`, `port-forward`, and Secret/config updates all fail.",
      'The control plane may reschedule managed pods elsewhere once tolerations expire. If the partitioned node is still actually running its pods, this risks two copies of a stateful process running at once — which is why fencing matters. Traffic from the control plane to kubelet or webhook ports can also fail in the same way.',
      "I identify the required direction and port from the provider's docs, test DNS/route/TCP, and check for recent firewall or NSG changes and flow logs, along with node/kubelet and API server logs. I restore only the specific rules that are needed, then confirm nodes go Ready, leases update, scheduling resumes, logs/exec work again, and the CNI and application are consistent.",
      'To prevent this: manage firewall rules through IaC and policy, monitor node heartbeat and connectivity, build redundant network paths, and actually test how the cluster behaves under a network partition.',
    ],
    followUps: [
      'Why is fencing important for stateful pods on a partitioned node?',
      'Which ports does the kubelet need open to the control plane?',
    ],
    tags: ['kubernetes', 'control plane', 'firewall'],
  },
  {
    id: 'itv-mynet-48',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Your service mesh sidecar consumes more resources than the app. How do you analyze and optimize it?',
    probing:
      'Whether you measure what drives sidecar cost and tune it without silently losing mTLS or telemetry.',
    answer: [
      "I measure the sidecar's CPU/memory against actual traffic and connection volume, request/response size, TLS handshake rate, retries/timeouts, access log volume, metrics cardinality, trace sampling rate, and the size of its config (clusters, listeners) and control-plane push/reload frequency. Distributed traces often reveal retry amplification or a slow backend as the real driver.",
      "I tune log/trace sampling, connection pool sizes, retry budgets, metrics volume, and which workloads actually need the mesh injected, and check whether the mesh version itself has a known issue. I size resources from a measured peak, not a guess. An ambient or sidecar-less mode is worth considering, but only after checking it covers the features and security controls I actually need — or I simply exclude workloads that don't need the mesh at all.",
      'I roll out any change as a canary, load-test mTLS/routing/failure behavior, and watch latency, errors, security posture, resource use, and cost. Removing the sidecar without this care can quietly remove identity, policy enforcement, or observability along with it.',
    ],
    followUps: [
      'What are the trade-offs of an ambient or sidecar-less mesh?',
      'How do retries amplify proxy load?',
    ],
    tags: ['kubernetes', 'service mesh', 'performance'],
  },
  {
    id: 'itv-mynet-49',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Your Kubernetes cluster is healthy, but requests intermittently return HTTP 503. How do you troubleshoot it?',
    probing:
      'Whether you trace one failing request through every layer instead of trusting "the cluster is healthy".',
    answer: [
      'I trace one failing request through the whole path: DNS → external load balancer or ingress → routing rule → Service → EndpointSlice → ready pod → application dependency. The cluster being "healthy" overall doesn\'t tell me whether endpoints, readiness, connection pools, or downstream services are actually healthy.',
      'I compare the time, host, path, zone, pod, and application version between successful and failed requests.',
      'I figure out whether the 503 came from the ingress/proxy or from the application itself, then check for empty or flapping endpoints, readiness failures, selector/port mismatches, insufficient capacity during a rolling update, zone imbalance, NetworkPolicy, service-mesh retries, upstream timeouts, connection-pool exhaustion, and dependency latency.',
      'I split load-balancer and ingress metrics by backend, response code, and upstream timing. The fix targets whichever layer the evidence points to — the health probe, selector, `targetPort`, timeout, readiness, capacity, or a dependency — rather than papering over it with unlimited retries.',
      'Afterward I run sustained traffic through the real hostname, confirm error and latency targets are met, simulate a pod being replaced, and alert on endpoint count, upstream 5xx rate, readiness churn, and saturation — how close a resource is to its limit.',
    ],
    code: [
      {
        title: 'Trace the ingress path',
        language: 'bash',
        code: `kubectl get ingress,svc,endpointslice,pods -A -o wide
kubectl describe ingress <name>
kubectl logs -n <ingress-namespace> deploy/<controller>
kubectl get events --sort-by=.metadata.creationTimestamp
curl -vk https://<host>/<path>`,
      },
    ],
    followUps: [
      'How do rolling updates cause brief 503s, and how do you prevent them?',
      'Which alerts would catch this earlier?',
    ],
    tags: ['kubernetes', '503', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-50',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Kubernetes Pods look healthy, but users receive HTTP 504 responses. How do you troubleshoot?',
    probing:
      'Whether you know a 504 is a proxy timeout and find the slow hop instead of raising every timeout.',
    answer: [
      'A 504 means a gateway or proxy timed out waiting for a response, so I check the response headers and logs to identify which component generated it, then trace the path: ingress/load balancer → Service/EndpointSlice → pod → downstream dependency.',
      'I compare connect time, response time, and total time at each hop, and check endpoint readiness, target ports, DNS, NetworkPolicy, mesh retries, connection pools, queue depth, CPU throttling, garbage collection, and database/dependency latency.',
      "A pod that shows as Running can still be slow or unreachable from the proxy's point of view. I stabilize the situation by reducing traffic, scaling the actual bottleneck, rolling back a bad change, or fixing the real timeout/dependency issue — never by just increasing every timeout — then confirm p95/p99 latency and real-user requests look right.",
    ],
    followUps: [
      'How do you find which proxy generated the 504?',
      'Why is raising every timeout a bad fix?',
    ],
    tags: ['kubernetes', '504', 'latency'],
  },
  {
    id: 'itv-mynet-51',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How can workloads in different Kubernetes namespaces communicate securely?',
    probing:
      'Whether you know cross-namespace DNS names and that namespaces do not block traffic without NetworkPolicy.',
    answer: [
      'Expose the destination through a Service and use cluster DNS — for example `api.payments.svc.cluster.local`. Clients in another namespace can usually just use `api.payments` plus the namespace name.',
      "Being in a different namespace doesn't block traffic on its own, so I add ingress and egress NetworkPolicies (enforced by the CNI) that allow only the required namespace labels, ports, and DNS path, and use workload identity/RBAC for API access.",
      "For an external dependency, an `ExternalName` Service can give it a DNS alias, but it doesn't add network security or health checking on its own. I test DNS resolution, endpoints, policy enforcement, and the full request path before calling it done.",
    ],
    tags: ['kubernetes', 'namespaces', 'dns', 'networkpolicy'],
  },
  {
    id: 'itv-mynet-52',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the difference between a Route and an Ingress?',
    probing: 'Whether you know OpenShift Routes vs portable Ingress and the Gateway API.',
    answer: [
      'Ingress is the standard Kubernetes API for HTTP(S) routing to Services, implemented by an Ingress controller. A Route is mainly an OpenShift resource that exposes a Service through the OpenShift router and adds some OpenShift-specific TLS/traffic behavior.',
      "They serve a similar purpose — routing traffic into the cluster — but they aren't interchangeable, portable APIs. For a new, portable Kubernetes design, I use a supported Ingress controller or the Gateway API, configure TLS, host/path routing, health checks, and security policy, then test the external request path end to end.",
    ],
    tags: ['kubernetes', 'ingress', 'openshift'],
  },
  {
    id: 'itv-mynet-53',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure Kubernetes Ingress traffic?',
    probing:
      'Whether you can combine TLS automation, WAF and access restrictions with a layer-by-layer check.',
    answer: [
      'Use TLS certificates (Cert-Manager) → Enable WAF/firewall rules → Restrict IP access → Use Istio/NGINX for advanced security.',
      '**Detailed interview approach:** I trace the path layer by layer: DNS → ingress/load balancer → Service → EndpointSlice → pod readiness and listening port. Commands like `kubectl get ingress,svc,endpointslice -o wide`, `kubectl describe`, controller logs, and `curl` from inside and outside the cluster show me where traffic actually stops.',
      "I check selectors, `port` versus `targetPort`, the ingress class/annotations, TLS/SNI, routes, cloud firewall/health probes, NetworkPolicy, and CNI health. I fix the one layer that's actually broken, then confirm the real hostname, status code, latency, and logs all look right.",
      'I avoid opening broad firewall rules as a shortcut. Health endpoints, synthetic tests, and config validation are what actually prevent this from happening again.',
    ],
    tags: ['kubernetes', 'ingress', 'security', 'tls'],
  },
  {
    id: 'itv-mynet-54',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you debug Kubernetes DNS issues?',
    probing:
      'Whether you test from the affected pod and compare timeouts with `NXDOMAIN` to locate a DNS fault.',
    answer: [
      'Check CoreDNS logs, verify ConfigMaps, run `nslookup` or `dig` from a Pod with `kubectl exec`, and ensure NetworkPolicies allow DNS traffic. Mini-case: Pods could not resolve Services because of an incorrect CoreDNS `stubDomain`; correcting the ConfigMap restored DNS resolution.',
      '**Detailed interview approach:** I test from the affected pod using `cat /etc/resolv.conf`, `nslookup kubernetes.default`, and a lookup for the failing Service/FQDN.',
      'I compare against a healthy namespace or node, then check the Service/EndpointSlice records, CoreDNS pods, logs, ConfigMap, resource saturation (how close CoreDNS is to running out of capacity), and the upstream DNS server.',
      'NetworkPolicy and firewall rules need to allow UDP and TCP on port 53 to cluster DNS. I also compare timeouts against `NXDOMAIN`: a timeout points to a path or capacity problem, while a wrong name or search domain gives a valid negative answer instead.',
      "Once I've made the targeted fix — to CoreDNS, a policy, or the upstream resolver — I test both short and full names, run an actual application call, and check DNS latency. If load caused the incident, I also add capacity and alerts.",
      '**Quick answer from a similar question (troubleshooting DNS issues in Kubernetes)**',
      'Run kubectl exec into pod → Test DNS resolution → Check CoreDNS logs → Restart CoreDNS pods → Fix network policies if blocking.',
    ],
    followUps: [
      'What would you change in the CoreDNS ConfigMap for a private upstream zone?',
      'What would you check first if the fix did not hold and the problem came back?',
    ],
    tags: ['kubernetes', 'dns', 'coredns'],
  },
  {
    id: 'itv-mynet-55',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you debug cross-cluster service communication failures?',
    probing:
      'Whether you can trace a cross-cluster call through DNS, routes, firewalls and mTLS with tracing evidence.',
    answer: [
      'Verify DNS resolution, network routes, firewall rules, service mesh mTLS settings, and mutual TLS cert validity; trace requests with distributed tracing (Jaeger) to identify where traffic is dropped.',
      'Mini-case: Tracing showed requests stopping at the ingress of cluster B; firewall rules were blocking healthcheck IP ranges — after opening the range, inter-cluster calls recovered.',
      '**Detailed interview approach:** I trace the path layer by layer: DNS → ingress/load balancer → Service → EndpointSlice → pod readiness and listening port. Commands like `kubectl get ingress,svc,endpointslice -o wide`, `kubectl describe`, controller logs, and `curl` from inside and outside the cluster show me where traffic actually stops.',
      "I check selectors, `port` versus `targetPort`, the ingress class/annotations, TLS/SNI, routes, cloud firewall/health probes, NetworkPolicy, and CNI health. I fix the one layer that's actually broken, then confirm the real hostname, status code, latency, and logs all look right.",
      'I avoid opening broad firewall rules as a shortcut. Health endpoints, synthetic tests, and config validation are what actually prevent this from happening again.',
    ],
    followUps: [
      'How would a service mesh change how you debug this?',
      'Which health-check source ranges must be allowed?',
    ],
    tags: ['kubernetes', 'multi-cluster', 'tracing'],
  },
  {
    id: 'itv-mynet-56',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you secure container-to-container communication in Kubernetes?',
    probing:
      'Whether you know NetworkPolicies and mTLS as the two layers of container-to-container protection.',
    answer: [
      'Use NetworkPolicies → Enable mutual TLS with Istio → Encrypt traffic.',
      '**Detailed interview approach:** I trace the path layer by layer: DNS → ingress/load balancer → Service → EndpointSlice → pod readiness and listening port. Commands like `kubectl get ingress,svc,endpointslice -o wide`, `kubectl describe`, controller logs, and `curl` from inside and outside the cluster show me where traffic actually stops.',
      "I check selectors, `port` versus `targetPort`, the ingress class/annotations, TLS/SNI, routes, cloud firewall/health probes, NetworkPolicy, and CNI health. I fix the one layer that's actually broken, then confirm the real hostname, status code, latency, and logs all look right.",
      'I avoid opening broad firewall rules as a shortcut. Health endpoints, synthetic tests, and config validation are what actually prevent this from happening again.',
    ],
    tags: ['kubernetes', 'mtls', 'networkpolicy'],
  },
  {
    id: 'itv-mynet-57',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you debug Kubernetes ingress not routing traffic?',
    probing: 'Whether you check controller logs, rules, DNS and backends in a sensible order.',
    answer: [
      'Check ingress controller logs → Validate annotations/paths → Check DNS → Verify backend service health.',
      '**Detailed interview approach:** I trace the path layer by layer: DNS → ingress/load balancer → Service → EndpointSlice → pod readiness and listening port. Commands like `kubectl get ingress,svc,endpointslice -o wide`, `kubectl describe`, controller logs, and `curl` from inside and outside the cluster show me where traffic actually stops.',
      "I check selectors, `port` versus `targetPort`, the ingress class/annotations, TLS/SNI, routes, cloud firewall/health probes, NetworkPolicy, and CNI health. I fix the one layer that's actually broken, then confirm the real hostname, status code, latency, and logs all look right.",
      'I avoid opening broad firewall rules as a shortcut. Health endpoints, synthetic tests, and config validation are what actually prevent this from happening again.',
    ],
    tags: ['kubernetes', 'ingress', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-58',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you protect Kubernetes against DDoS attacks?',
    probing:
      'Whether you layer edge DDoS protection, rate limiting and WAF with general cluster hardening.',
    answer: [
      'Use cloud-native DDoS protection (Cloud Armor/Azure DDoS Protection) → Apply rate limiting → Enable WAF on ingress.',
      '**Detailed interview approach:** I apply defense in depth: a private/restricted API server, SSO, and least-privilege RBAC (giving each identity only the access it needs), separate service accounts, Pod Security Admission, non-root and read-only containers, seccomp, admission policy, default-deny NetworkPolicies, encrypted secrets, and audit/runtime monitoring.',
      'Images are pinned, scanned, signed, and only admitted from approved registries.',
      'If I suspect a workload has been exposed, I isolate it, preserve audit and runtime evidence, revoke its tokens or credentials, check for lateral movement, and rebuild it from a trusted image.',
      'I verify both the denied and allowed paths using real service accounts, and periodically review RBAC for unused permissions, rotate certificates and secrets, check patch levels, confirm backup/restore works, and review policy exceptions.',
    ],
    followUps: [
      'Where would you apply rate limiting: at the edge, the ingress, or the app?',
      'How do you tell a DDoS from a legitimate traffic spike?',
    ],
    tags: ['kubernetes', 'ddos', 'security'],
  },
  {
    id: 'itv-mynet-59',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot a Kubernetes service not reachable externally?',
    probing:
      'Whether you check the Service type, Ingress rules and cloud firewall/load balancer when external access fails.',
    answer: [
      'Check service type (ClusterIP vs LoadBalancer) → Validate Ingress rules → Ensure firewall/load balancer rules are correct.',
      '**Detailed interview approach:** I trace the path layer by layer: DNS → ingress/load balancer → Service → EndpointSlice → pod readiness and listening port. Commands like `kubectl get ingress,svc,endpointslice -o wide`, `kubectl describe`, controller logs, and `curl` from inside and outside the cluster show me where traffic actually stops.',
      "I check selectors, `port` versus `targetPort`, the ingress class/annotations, TLS/SNI, routes, cloud firewall/health probes, NetworkPolicy, and CNI health. I fix the one layer that's actually broken, then confirm the real hostname, status code, latency, and logs all look right.",
      'I avoid opening broad firewall rules as a shortcut. Health endpoints, synthetic tests, and config validation are what actually prevent this from happening again.',
    ],
    tags: ['kubernetes', 'services', 'troubleshooting'],
  },
  {
    id: 'itv-mynet-60',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you handle Kubernetes pod networking issues?',
    probing: 'Whether you check CNI health, IP assignment and policies when pod networking breaks.',
    answer: [
      'Check CNI plugin logs → Validate IP assignment → Restart kube-proxy or CNI → Apply Network Policies correctly.',
      '**Detailed interview approach:** I trace the path layer by layer: DNS → ingress/load balancer → Service → EndpointSlice → pod readiness and listening port. Commands like `kubectl get ingress,svc,endpointslice -o wide`, `kubectl describe`, controller logs, and `curl` from inside and outside the cluster show me where traffic actually stops.',
      "I check selectors, `port` versus `targetPort`, the ingress class/annotations, TLS/SNI, routes, cloud firewall/health probes, NetworkPolicy, and CNI health. I fix the one layer that's actually broken, then confirm the real hostname, status code, latency, and logs all look right.",
      'I avoid opening broad firewall rules as a shortcut. Health endpoints, synthetic tests, and config validation are what actually prevent this from happening again.',
    ],
    tags: ['kubernetes', 'cni', 'networking'],
  },
  {
    id: 'itv-mynet-61',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you implement Service Mesh in Kubernetes?',
    probing:
      'Whether you adopt a mesh for a concrete need and roll out mTLS and authorization gradually.',
    answer: [
      'Deploy Istio/Linkerd → Enable traffic routing, retries, and observability → Use for canary/blue-green deployments.',
      '**Detailed interview approach:** I bring in a service mesh for a specific need — workload identity, mTLS, traffic policy, or better telemetry — not just to add proxies for their own sake. I inventory the protocols and ports in use, install the control plane and monitor it, onboard one non-critical namespace first, and check the sidecar or ambient resource overhead.',
      "Identities come from service accounts and short-lived certificates. I move mTLS from permissive to strict only after confirming I've seen every legitimate caller. AuthorizationPolicy then allows the exact service-to-service paths that are needed and denies everything else by default.",
      'I test certificate rotation, retries/timeouts, what happens if the control plane fails, and any way traffic could bypass the proxy — then roll out gradually. Dashboards and tracing confirm latency and error rates are healthy, and I keep clear upgrade and version-skew procedures so the mesh stays supportable.',
    ],
    followUps: [
      'How do you move from permissive to strict mTLS without breaking callers?',
      'What does the mesh cost you operationally?',
    ],
    tags: ['kubernetes', 'service mesh', 'istio', 'mtls'],
  },
  {
    id: 'itv-mynet-62',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot network issues in Kubernetes?',
    probing:
      'Whether you have a quick checklist of kubectl checks plus a layered approach for network issues.',
    answer: [
      '- Check kubectl get svc for service mapping.\n- Validate Network Policies.\n- Run kubectl exec to test connectivity (ping, curl).\n- Use kubectl describe svc to verify correct target pods.',
      '**Detailed interview approach:** I trace the path layer by layer: DNS → ingress/load balancer → Service → EndpointSlice → pod readiness and listening port. Commands like `kubectl get ingress,svc,endpointslice -o wide`, `kubectl describe`, controller logs, and `curl` from inside and outside the cluster show me where traffic actually stops.',
      "I check selectors, `port` versus `targetPort`, the ingress class/annotations, TLS/SNI, routes, cloud firewall/health probes, NetworkPolicy, and CNI health. I fix the one layer that's actually broken, then confirm the real hostname, status code, latency, and logs all look right.",
      'I avoid opening broad firewall rules as a shortcut. Health endpoints, synthetic tests, and config validation are what actually prevent this from happening again.',
    ],
    tags: ['kubernetes', 'networking', 'troubleshooting'],
  },
]
