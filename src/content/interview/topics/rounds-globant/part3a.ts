import type { InterviewQuestion } from '../../../types'

/** Real round, part 3 (Q1-Q18): private networking, Key Vault 403s, storage DR, WAF, monitoring, pipelines and SRE metrics. */
export const roundsGlobantPart3aQuestions: InterviewQuestion[] = [
  {
    id: 'itv-rglb3-1',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What is the most challenging issue you faced in production or other environments, and how did you fix it?',
    probing:
      'A STAR story with real depth: a layered, methodical troubleshooting order (DNS, routes, firewall, NSG, identity), concrete tools and fixes, and prevention through IaC and alerts.',
    answer: [
      'Answer with **STAR**: Situation, Task, Action, Result. Pick one real story and go deep. (This is a project-style sample: change the details to match what you really did, because interviewers ask follow-up questions.)',
      '**Sample story: a private AKS cluster behind Azure Firewall**',
      '**Situation:** we were building AKS in a **spoke VNet**. A **UDR** sent all outbound traffic (`0.0.0.0/0`) to **Azure Firewall** in the hub, and the cluster API server was **private**. Nothing worked on the first deployment.',
      '**Action:** I fixed it one layer at a time.',
      '- **Firewall egress**: Symptom: Nodes `NotReady`, pods in `ImagePullBackOff`; Root cause: Firewall blocked MCR, ACR and the AKS required endpoints; Fix: Added the `AzureKubernetesService` FQDN tag, MCR/ACR rules and required ports (443, 9000, 1194); confirmed in firewall logs\n- **Private DNS**: Symptom: Private endpoints and API server resolved to public IPs, or not at all; Root cause: Private DNS zones were not linked to the hub and spoke VNets; Fix: Linked `privatelink.<region>.azmk8s.io`, `privatelink.azurecr.io` and `privatelink.vaultcore.azure.net`; custom DNS forwards to `168.63.129.16`; checked with `nslookup`\n- **Pipeline access**: Symptom: `kubectl` deploy from Azure DevOps failed; Root cause: Microsoft-hosted agents cannot reach a private API server; Fix: Self-hosted agent inside the VNet, and `az aks command invoke` for emergencies\n- **NSG / UDR**: Symptom: Intermittent timeouts; Root cause: NSG rule, and asymmetric routing through the firewall; Fix: Network Watcher (IP flow verify, next hop) and NSG flow logs; corrected rules and routes\n- **Subnet IPs**: Symptom: Scale-up failed; Root cause: Azure CNI gives every pod a VNet IP; the subnet was too small; Fix: Re-planned the subnet size; moved to Azure CNI Overlay',
      '**Order I troubleshot in:** DNS first, then routes and firewall logs, then NSGs, then identity and permissions.',
      '**Prevention:** firewall rules, DNS zone links and NSG/UDR config all moved into Terraform; alerts on firewall denies and node `NotReady`.',
      '**Result:** the cluster became stable, and the same pattern was reused for the other environments without the same failures.',
      '**Interview-ready answer**',
      '"The hardest one was building a private AKS cluster in a spoke VNet where all egress went through Azure Firewall. Nodes stayed NotReady and images would not pull. I worked layer by layer: I allowed the AKS FQDN tag and the MCR and ACR endpoints on the firewall, linked the private DNS zones for AKS, ACR and Key Vault to the hub and spoke VNets, moved deployments to a self-hosted agent inside the VNet, fixed an asymmetric route found with Network Watcher, and resized the subnet. Then I put all of it in Terraform with alerts, so the next environments came up cleanly."',
    ],
    code: [
      {
        title: 'Troubleshooting order',
        language: 'text',
        code: `DNS (nslookup -> private IP?)
  -> Routes (UDR next hop, asymmetric routing)
  -> Firewall logs (denied FQDNs / ports)
  -> NSGs (IP flow verify, flow logs)
  -> Identity and permissions`,
      },
      {
        title: 'Useful checks for a private AKS cluster',
        language: 'bash',
        code: `# Run kubectl against a private API server without network line of sight
az aks command invoke -g rg-aks -n aks-prod --command "kubectl get nodes"

# Does the API server / registry resolve to a private IP?
nslookup aks-prod-dns-xxxx.privatelink.eastus.azmk8s.io
nslookup myacr.azurecr.io

# Which next hop does the node subnet use?
az network watcher show-next-hop -g rg-aks --vm <node-vm> \\
  --source-ip 10.1.0.4 --dest-ip 20.0.0.1`,
      },
    ],
    traps: [
      'Saying "we opened all outbound traffic on the firewall" - that defeats the hub firewall; allow the AKS FQDN tag and the specific required endpoints.',
      'Telling a story with no measurable result or no prevention step - interviewers look for what you changed so it never happened again.',
    ],
    followUps: [
      'What exactly does the AzureKubernetesService FQDN tag allow, and what still needs explicit rules?',
      'How did you detect the asymmetric routing, and what causes it with a hub firewall?',
      'Why does Azure CNI Overlay help with subnet IP exhaustion?',
    ],
    tags: ['aks', 'private cluster', 'azure firewall', 'private dns', 'troubleshooting', 'star'],
  },
  {
    id: 'itv-rglb3-2',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'You set up a private endpoint, but the App Service still gets a 403 Forbidden when it reads a Key Vault secret. What might have gone wrong?',
    probing:
      'Separating network/DNS causes from identity/permission causes using the error text and caller IP, and knowing that a private endpoint is inbound-only so the App Service also needs VNet integration.',
    answer: [
      'A **403** means the request **reached Key Vault and was rejected**. First read the error text: it tells you if it is a **network** problem or a **permission** problem.',
      '- **`ForbiddenByFirewall`, "Client address is not authorized"**: Type: Network / DNS: the call did not come through the private endpoint\n- **`ForbiddenByRbac`, `ForbiddenByPolicy`, "does not have secrets get permission"**: Type: Identity / permission',
      '**1. Network path (DNS and routing)**',
      "- **No VNet integration** on the App Service. A private endpoint only helps **inbound to Key Vault**; the app's **outbound** calls need VNet integration, or they go over the internet and hit the vault firewall.\n- **DNS returns the public IP:** the `privatelink.vaultcore.azure.net` zone is missing, not linked to the VNet the app uses, or has no A record. With custom DNS (hub-and-spoke), it must forward to `168.63.129.16` or a DNS Private Resolver.\n- **Route All is off** (`vnetRouteAllEnabled` / `WEBSITE_VNET_ROUTE_ALL`), so some traffic does not use the VNet. Or an NSG, UDR or firewall blocks 443 to the private endpoint subnet.\n- **Key Vault references** (`@Microsoft.KeyVault(...)`) resolve through the VNet only when the app's outbound traffic is routed through the VNet.\n- The private endpoint connection is still **Pending**, not **Approved**.",
      '**2. Identity and permissions**',
      '- **Managed identity not enabled**, or the wrong one. A user-assigned identity must be set as `keyVaultReferenceIdentity`.\n- **No role or access policy**: RBAC needs **Key Vault Secrets User**; the access policy model needs **Get** on secrets.\n- **Permission model mismatch** (very common): the vault uses **Azure RBAC**, but someone added an **access policy**, or the other way round.\n- Role assigned at the wrong scope, or RBAC has not propagated yet (a few minutes).',
      '**3. Other causes:** the secret is disabled or expired, the reference syntax is wrong, or an Azure Policy or cross-tenant setting blocks access.',
      '**How I troubleshoot**',
      '- If `CallerIPAddress` is a **public IP**, it is a network/DNS problem.\n- If it is a **private IP**, it is an identity/permission problem.\n- In the App Service **Environment variables** blade, each Key Vault reference shows its status and error.',
      '**Interview-ready answer**',
      '"A 403 means Key Vault received the call and rejected it, so I read the error first. ForbiddenByFirewall means the traffic did not come through the private endpoint: usually VNet integration is missing on the App Service, Route All is off, or the privatelink.vaultcore.azure.net zone is not linked, so DNS returns the public IP. ForbiddenByRbac means the identity is wrong: managed identity not enabled, no Key Vault Secrets User role, or the vault uses RBAC while someone set an access policy. I check nslookup from Kudu and the caller IP in the Key Vault logs to tell the two apart quickly."',
    ],
    code: [
      {
        title: 'From the Kudu / SSH console of the App Service',
        language: 'bash',
        code: `nslookup kv-prod.vault.azure.net        # must return a private IP like 10.x.x.x
tcpping kv-prod.vault.azure.net:443     # (Windows Kudu) or: curl -v https://kv-prod.vault.azure.net`,
      },
      {
        title: 'KQL: Key Vault diagnostic logs - who called, from where, with what result',
        language: 'text',
        code: `AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where httpStatusCode_d == 403
| project TimeGenerated, OperationName, CallerIPAddress, identity_claim_oid_g, ResultSignature, ResultDescription
| order by TimeGenerated desc`,
      },
    ],
    traps: [
      'Assuming the private endpoint alone fixes outbound access from App Service - it only provides an inbound private IP for the vault; the app still needs regional VNet integration.',
      'Adding an access policy to a vault that uses the Azure RBAC permission model - it is ignored, and the 403 stays.',
    ],
    followUps: [
      'How does DNS resolution work for a private endpoint in a hub-and-spoke network with custom DNS servers?',
      'What is the difference between the Key Vault Secrets User and Key Vault Secrets Officer roles?',
      'How do you make a Key Vault reference use a user-assigned managed identity?',
    ],
    tags: [
      'key vault',
      'private endpoint',
      'app service',
      'vnet integration',
      'rbac',
      'troubleshooting',
    ],
  },
  {
    id: 'itv-rglb3-3',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Apart from configuring the Storage Account with GRS, do we have to do anything ourselves to access the data in a regional outage?',
    probing:
      'Knowing GRS secondaries are not readable and do not fail over automatically: RA-GRS/RA-GZRS for reads, customer-managed failover for writes, Last Sync Time, and re-enabling geo-redundancy after failover.',
    answer: [
      '**Yes.** GRS only **keeps a copy** of the data in the paired region. By default:',
      '- the secondary copy is **not readable**, and\n- the account **does not fail over automatically**.',
      '**What you need to do**',
      '- **Use RA-GRS or RA-GZRS if the app must read during an outage**: Why: Gives a read-only secondary endpoint: `<account>-secondary.blob.core.windows.net`\n- **Change the app to use the secondary endpoint**: Why: Endpoints and connection strings do not switch by themselves; SDKs can retry reads against a secondary location\n- **Start the failover yourself for write access**: Why: **Customer-managed failover** (portal, CLI, PowerShell). Microsoft-managed failover happens only in extreme cases\n- **Check Last Sync Time first**: Why: Replication is asynchronous, so writes after the last sync can be lost (RPO is usually under 15 minutes, not guaranteed)\n- **Re-enable geo-redundancy after an unplanned failover**: Why: After failover the account is **LRS** in the new primary; you must turn GRS on again (re-sync can take time). A *planned* failover keeps geo-redundancy\n- **Prepare networking in the secondary region**: Why: Private endpoints, private DNS records and firewall rules for the secondary region, or the app cannot reach it\n- **Check access**: Why: SAS tokens, keys and managed identity roles still work after failover\n- **Test it**: Why: Run a failover drill in non-prod and measure RTO and RPO',
      '**Interview-ready answer**',
      '"Yes. GRS only keeps a copy in the paired region; the secondary is not readable and there is no automatic failover. If the app needs to read during an outage I use RA-GRS or RA-GZRS and code the app to use the secondary endpoint. For writes I trigger a customer-managed failover myself, after checking Last Sync Time because replication is asynchronous. After an unplanned failover the account becomes LRS, so I re-enable GRS. I also prepare private endpoints and DNS in the secondary region and test the failover in a drill."',
    ],
    code: [
      {
        title: 'Replication status and customer-managed failover',
        language: 'bash',
        code: `# See replication status
az storage account show -n stappprod -g rg-app --expand geoReplicationStats \\
  --query geoReplicationStats

# Customer-managed (unplanned) failover
az storage account failover -n stappprod -g rg-app`,
      },
    ],
    traps: [
      'Saying "GRS fails over automatically" - Microsoft-managed failover is a last resort; you normally initiate the failover yourself.',
      'Forgetting the data loss window: anything written after Last Sync Time may be lost in an unplanned failover.',
    ],
    followUps: [
      'What is the difference between GRS, GZRS and RA-GZRS?',
      'What is the difference between a planned and an unplanned customer-managed failover?',
      'How would you protect against accidental deletion, which geo-replication also copies?',
    ],
    tags: ['storage account', 'grs', 'ra-gzrs', 'failover', 'disaster recovery'],
  },
  {
    id: 'itv-rglb3-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you worked with Azure Front Door and Traffic Manager?',
    probing:
      'The layer difference: Traffic Manager is DNS-only and protocol-agnostic with TTL-bound failover, Front Door is a global L7 proxy with WAF, TLS offload, caching and fast failover, plus how origins are locked down.',
    answer: [
      'Yes. Both send users to the right region, but they work at **different layers**.',
      "- **Traffic Manager** is a **DNS-based** load balancer. It only answers the DNS query; the client then connects **directly** to the endpoint.\n- **Front Door** is a **global layer-7 (HTTP/HTTPS) reverse proxy** at Microsoft's edge. Traffic actually flows **through** it.",
      '- **Layer**: Traffic Manager: DNS; Azure Front Door: HTTP/HTTPS proxy at the edge\n- **Protocols**: Traffic Manager: Any (HTTP, TCP, UDP, ...); Azure Front Door: HTTP/HTTPS only\n- **Failover speed**: Traffic Manager: Depends on DNS **TTL** and client caching; Azure Front Door: Fast, health-probe based, no DNS wait\n- **WAF**: Traffic Manager: No; Azure Front Door: **Yes** (Premium has managed rule sets and bot protection)\n- **TLS offload, caching, compression**: Traffic Manager: No; Azure Front Door: Yes\n- **URL path routing, rewrite**: Traffic Manager: No; Azure Front Door: Yes\n- **Private origins**: Traffic Manager: No; Azure Front Door: **Private Link** to origins (Premium)\n- **Routing methods**: Traffic Manager: Priority, weighted, performance, geographic, multivalue, subnet; Azure Front Door: Latency-based, priority, weighted, session affinity',
      '**Where I used them**',
      '- **Front Door Premium with WAF** in front of two regional App Services (or Application Gateways), with health probes, for a multi-region web app. Origins locked down so they only accept traffic from Front Door (`AzureFrontDoor.Backend` service tag + `X-Azure-FDID` header check, or Private Link).\n- **Traffic Manager** for a **non-HTTP** workload, and as a simple DNS failover between two regions.',
      '**Note:** Front Door is **global**, Application Gateway is **regional**. They are often used together: Front Door at the edge, Application Gateway inside each region.',
      '**Interview-ready answer**',
      '"Yes. Traffic Manager is DNS-based: it returns the healthy endpoint\'s address and the client connects directly, so it supports any protocol but failover depends on DNS TTL. Front Door is a global HTTP/S reverse proxy at the Microsoft edge with WAF, TLS offload, caching, path routing and fast health-probe failover. I used Front Door Premium with WAF in front of App Services in two regions, locked the origins to Front Door, and used Traffic Manager for a non-HTTP workload."',
    ],
    code: [
      {
        title: 'Traffic flow: Traffic Manager vs Front Door',
        language: 'text',
        code: `Traffic Manager (DNS only):
  Client --DNS query--> Traffic Manager --returns healthy endpoint IP/name--> Client
  Client ------------------- connects directly -------------------------> Endpoint

Front Door (proxy):
  Client --HTTPS--> Front Door edge (WAF, TLS, cache) --HTTPS--> Origin (region A / B)`,
      },
    ],
    traps: [
      'Saying the service tag alone locks an origin to your Front Door - the AzureFrontDoor.Backend tag covers every Front Door profile, so also check the X-Azure-FDID header (or use Private Link).',
    ],
    followUps: [
      'How do you restrict an App Service so it only accepts traffic from your Front Door profile?',
      'When would you put Application Gateway behind Front Door?',
      'Why can Traffic Manager failover take longer than the configured probe interval?',
    ],
    tags: ['front door', 'traffic manager', 'load balancing', 'multi-region', 'waf'],
  },
  {
    id: 'itv-rglb3-5',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'My app is behind Application Gateway with WAF and the default Microsoft rules. One default rule blocks my app. How do you unblock the application?',
    probing:
      'Not disabling WAF: finding the rule ID and matched variable in the firewall log, confirming a false positive, preferring a scoped exclusion over a rule override, and governing the change in IaC.',
    answer: [
      '**Do not turn WAF off**, and do not switch the whole policy to Detection permanently. Find the exact rule, confirm it is a **false positive**, and make the **smallest** change.',
      '**1. Find the rule in the firewall logs** (diagnostic settings, then Log Analytics). This gives the **rule ID** (for example `942130`, a SQL injection rule) and the **matched variable** (for example the post argument `comment`).',
      '**2. Confirm it is a false positive:** the request is legitimate (for example a JSON field with special characters). Test in non-prod if needed.',
      '**3. Fix it, narrowest option first:**',
      '- **Exclusion** (preferred): What it does: Skips inspection of **one request field** (header, cookie, query arg, post arg) **for that rule only**. The rule still checks everything else; When: A specific field triggers the rule\n- **Disable the single rule** (rule override): What it does: Turns off that **one rule ID** in the managed rule set, or changes its action to **Log**; When: The rule is wrong for the whole app\n- **Custom allow rule**: What it does: Allows a trusted path or source IP before managed rules run; When: Rarely; very wide\n- **Per-site / per-URI WAF policy**: What it does: A separate policy for one listener or path; When: Only that app or path needs the change',
      '**4. Test and monitor:** retest the app, and watch the logs for new blocks.',
      '**5. Govern:** keep the exclusion in IaC, record the rule ID and reason, get security approval, and review it regularly.',
      '**Interview-ready answer**',
      '"I would not disable WAF. I check the ApplicationGatewayFirewallLog in Log Analytics to get the rule ID and the matched field, and confirm it is a false positive. Then I make the narrowest change: preferably a WAF policy exclusion for just that field, scoped to that rule, so the rule still protects everything else. If that is not enough, I override and disable only that one rule ID in the managed rule set. I do it in Terraform, document why, get security sign-off and keep monitoring the logs."',
    ],
    code: [
      {
        title: 'KQL: find the blocking rule',
        language: 'text',
        code: `AzureDiagnostics
| where Category == "ApplicationGatewayFirewallLog"
| where action_s in ("Blocked", "Matched")
| project TimeGenerated, clientIp_s, requestUri_s, ruleId_s, Message,
          details_message_s, details_data_s
| order by TimeGenerated desc`,
      },
      {
        title: 'Terraform: exclusion (preferred) and single-rule override',
        language: 'hcl',
        code: `resource "azurerm_web_application_firewall_policy" "waf" {
  name                = "waf-app-prod"
  resource_group_name = "rg-network"
  location            = "eastus"

  policy_settings {
    mode    = "Prevention"
    enabled = true
  }

  managed_rules {
    # Option 1: exclusion - don't inspect the "comment" field for rule 942130 only
    exclusion {
      match_variable          = "RequestArgNames"
      selector_match_operator = "Equals"
      selector                = "comment"
      excluded_rule_set {
        type    = "Microsoft_DefaultRuleSet"
        version = "2.1"
        rule_group {
          rule_group_name = "SQLI"
          excluded_rules  = ["942130"]
        }
      }
    }

    managed_rule_set {
      type    = "Microsoft_DefaultRuleSet"
      version = "2.1"

      # Option 2: override - disable one rule
      rule_group_override {
        rule_group_name = "SQLI"
        rule {
          id      = "942130"
          enabled = false
        }
      }
    }
  }
}`,
      },
    ],
    traps: [
      'Switching the whole policy to Detection mode "temporarily" and never switching it back.',
      'A broad custom allow rule for a path or IP - it bypasses every managed rule for that traffic, not just the one false positive.',
    ],
    followUps: [
      'What is the difference between Detection and Prevention mode, and how does anomaly scoring work in DRS 2.x?',
      'How would you scope a WAF change to one listener or one URI path only?',
      'How do you stop the same false positive reappearing when you upgrade the rule set version?',
    ],
    tags: ['application gateway', 'waf', 'false positive', 'terraform', 'kql'],
  },
  {
    id: 'itv-rglb3-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Have you worked with Azure Monitor? Have you written any workbooks?',
    probing:
      'Hands-on with metrics, Log Analytics, Application Insights and alerts, real KQL-based workbooks with parameters, and deploying workbooks as code.',
    answer: [
      'Yes. I used Azure Monitor **metrics, Log Analytics, Application Insights and alerts** for App Service, AKS and Key Vault, and built **workbooks** with KQL so the team had one view instead of many portal blades.',
      '**Workbook** = an interactive report in the portal: parameters, KQL queries, charts, grids and text in one page.',
      '**Workbooks I built**',
      '- **App Service health**: What it showed: Requests, failures, p95 response time, 4xx/5xx trend; Data source: Application Insights\n- **Key Vault access**: What it showed: 401/403 counts, top callers, operations by identity; Data source: Key Vault diagnostic logs\n- **AKS and infrastructure**: What it showed: Node CPU/memory, pod restarts, disk usage with threshold colours; Data source: Container Insights, VM metrics\n- **SLO report**: What it showed: Availability and error budget left per service; Data source: Application Insights',
      '**Good practices for workbooks**',
      '- **Parameters** at the top (subscription, resource group, time range) so one workbook serves every environment.\n- **Conditional formatting** (green/amber/red) on thresholds.\n- Workbook stored as **ARM/Bicep/Terraform** (`azurerm_application_insights_workbook`) so it is deployed the same way everywhere.\n- **Alerts** with action groups are for notification; the workbook is for investigation. Each alert links to the workbook.',
      '**Interview-ready answer**',
      '"Yes. I used Azure Monitor metrics, Log Analytics, Application Insights and alerts with action groups. I built workbooks with KQL, for example an App Service health workbook with failures and p95 latency, a Key Vault access workbook showing 403s by caller, and an SLO report. I add parameters for subscription and time range so one workbook works for all environments, and I deploy them as code. Alerts notify us, and the alert links to the workbook for investigation."',
    ],
    code: [
      {
        title: 'KQL: App Service failures and latency',
        language: 'text',
        code: `requests
| where timestamp > ago(24h)
| summarize Total = count(),
            Failed = countif(success == false),
            P95ms = percentile(duration, 95)
          by bin(timestamp, 15m), cloud_RoleName
| extend FailurePct = round(100.0 * Failed / Total, 2)`,
      },
    ],
    followUps: [
      'What is the difference between a workbook, a dashboard and Azure Managed Grafana?',
      'How do you make one workbook work across subscriptions and environments?',
      'How do you deploy a workbook with Bicep or Terraform?',
    ],
    tags: ['azure monitor', 'workbooks', 'kql', 'application insights', 'log analytics'],
  },
  {
    id: 'itv-rglb3-7',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Have you worked on SRE topics like SLOs, SLIs and error budgets? How do you calculate the error budget?',
    probing:
      'Doing the arithmetic correctly (time-based and request-based), and knowing burn rate with fast-burn and slow-burn alerting and what happens when the budget runs out.',
    answer: [
      'Yes. Short definitions:',
      '- **SLI**: what you measure, for example % of successful requests.\n- **SLO**: the target for the SLI, for example 99.9% over 30 days.\n- **Error budget**: how much failure the SLO still allows.',
      '**Formula:** `Error budget = 100% - SLO`',
      '**Time-based example: 99.9% availability over 30 days**',
      '- Minutes in 30 days = 30 x 24 x 60 = **43,200**\n- Error budget = 0.1% x 43,200 = **43.2 minutes** of allowed downtime\n- An incident causes 30 minutes of downtime: used 30 / 43.2 = about **69%**, about **13.2 minutes left**',
      '- **99%**: Error budget: 1%; Allowed downtime: 7.2 hours\n- **99.9%**: Error budget: 0.1%; Allowed downtime: 43.2 minutes\n- **99.95%**: Error budget: 0.05%; Allowed downtime: 21.6 minutes\n- **99.99%**: Error budget: 0.01%; Allowed downtime: 4.32 minutes',
      '**Request-based example:** SLO 99.9% success, 10,000,000 requests in a month gives a budget of **10,000 failed requests**. If 7,500 have failed, **75%** of the budget is used.',
      '**Burn rate:** `Burn rate = actual error rate / allowed error rate`',
      '- Burn rate **1** uses exactly the whole budget by the end of the window.\n- Burn rate **10** empties it in one tenth of the window (3 days of a 30-day window), so page the on-call.\n- Common practice: **fast-burn** alert (high burn rate over 1 hour) pages; **slow-burn** alert (over 6-24 hours) creates a ticket.',
      '**Interview-ready answer**',
      '"Yes. The error budget is 100% minus the SLO. For 99.9% availability over 30 days, that is 0.1% of 43,200 minutes, so 43.2 minutes of downtime. If an incident takes 30 minutes, we have used about 69% of the budget. For request-based SLOs, 99.9% of 10 million requests gives 10,000 allowed failures. I alert on burn rate: a fast burn pages the on-call, a slow burn creates a ticket, and when the budget is used up we pause risky releases and focus on reliability."',
    ],
    code: [
      {
        title: 'Error budget and burn rate',
        language: 'text',
        code: `Error budget = 100% - SLO
Burn rate    = actual error rate / allowed error rate

99.9% over 30 days:
  30 x 24 x 60       = 43,200 minutes
  0.1% x 43,200      = 43.2 minutes allowed downtime
  30 min incident    -> 30 / 43.2 = ~69% used, ~13.2 minutes left`,
      },
    ],
    traps: [
      'Alerting on a raw error-rate threshold only - burn-rate alerts tie the page to how fast you are spending the budget.',
    ],
    followUps: [
      'Why use multi-window burn-rate alerts instead of a single threshold?',
      'What does the team actually do when the error budget is exhausted?',
      'How would you build an SLO report from Application Insights data?',
    ],
    tags: ['sre', 'slo', 'sli', 'error budget', 'burn rate'],
  },
  {
    id: 'itv-rglb3-8',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'A pipeline variable and a variable group variable have the same name. If both are used in the same pipeline, which one does the pipeline use?',
    probing:
      'Knowing YAML precedence is order-based (last listed wins at the same scope, narrower scope wins), Classic gives the pipeline variable precedence, and that duplicates should be removed.',
    answer: [
      'It depends on the **pipeline type** and **where** each is defined.',
      '**YAML pipelines:** variables are processed **in the order they are listed** under `variables:`. At the same scope, **the one defined last wins**. Reverse the order and the variable group value wins.',
      'Other YAML precedence rules:',
      '- A **narrower scope wins**: job-level > stage-level > pipeline (root) level.\n- Variables in the YAML file **override** variables set in the pipeline **UI** (Edit, then Variables) with the same name.\n- A value set at **queue time** (only if "Let users override this value when running this pipeline" is ticked) overrides the UI value.\n- A script with `##vso[task.setvariable variable=env]value` changes it for the **later steps**.',
      '**Classic pipelines:** a variable defined **directly in the pipeline** takes precedence over a variable with the same name from a **linked variable group**. In Classic release pipelines, **stage-scoped** variables beat **release-scoped** ones.',
      '**If both hold the same value**, the result is the same either way. But it is still bad practice: if one value changes later, it becomes confusing which one is used.',
      '**What I do:** keep each variable in **one place**. Shared and secret values in a variable group (linked to Key Vault); pipeline-only values in the pipeline.',
      '**Interview-ready answer**',
      '"In YAML it depends on order: variables are processed top to bottom, so whichever is listed last at the same scope wins, and job-level beats stage-level beats root level. In Classic pipelines the pipeline\'s own variable takes precedence over the variable group. If the values are the same the result is identical, but I would remove the duplicate and keep each variable in one place, because the day someone changes one of them, nobody will know which value is used."',
    ],
    code: [
      {
        title: 'YAML: the one listed last wins',
        language: 'yaml',
        code: `variables:
  - group: my-variable-group    # defines env = dev
  - name: env
    value: prod                 # listed later -> env = prod

# Reverse the order and the variable group value wins`,
      },
    ],
    traps: [
      'Answering "the variable group always wins" (or "the pipeline variable always wins") for YAML - it is order and scope that decide.',
    ],
    followUps: [
      'How do you let users override a variable at queue time, and what is the risk?',
      'How does `##vso[task.setvariable]` with `isOutput=true` pass a value to another job?',
      'What is the difference between macro `$(var)`, template `${{ variables.var }}` and runtime `$[variables.var]` syntax?',
    ],
    tags: ['azure devops', 'variables', 'variable groups', 'yaml pipelines', 'classic pipelines'],
  },
  {
    id: 'itv-rglb3-9',
    level: 'basic',
    kind: 'open',
    prompt: 'Can I create Storage Accounts with the same name in two different subscriptions?',
    probing:
      'Knowing storage account names are globally unique across all of Azure, the naming rules, and how to check availability.',
    answer: [
      '**No.** A storage account name must be **globally unique across all of Azure**, not just per subscription or tenant.',
      '**Storage account naming rules:**',
      '- **3 to 24 characters**\n- **Lowercase letters and numbers only** (no hyphens, no capitals)',
      'If the name is already used by anyone, anywhere, creation fails with `StorageAccountAlreadyTaken` / "The storage account named X is already taken".',
      '**Interview-ready answer**',
      '"No. Storage account names are globally unique across all of Azure, not per subscription. They must be 3 to 24 characters, lowercase letters and numbers only. If someone else in any tenant already uses the name, the deployment fails, so I check availability with `az storage account check-name` and use a naming convention with a unique suffix."',
    ],
    code: [
      {
        title: 'Check name availability',
        language: 'bash',
        code: `az storage account check-name --name stappprod001
# { "nameAvailable": false, "reason": "AlreadyExists", ... }`,
      },
    ],
    tags: ['storage account', 'naming', 'azure basics'],
  },
  {
    id: 'itv-rglb3-10',
    level: 'basic',
    kind: 'open',
    prompt:
      "Why must the Storage Account name be unique? Why doesn't this apply to other resources?",
    probing:
      'Linking global uniqueness to the public DNS hostname, contrasting it with resource IDs scoped by subscription and resource group, and naming other DNS-bound resources.',
    answer: [
      '**Why storage names are unique:** the name becomes part of a **public DNS hostname** (blob, file, queue, table and dfs endpoints). DNS names must be unique worldwide, so the name must be too.',
      '**Why most other resources are not:** most resources are identified by their **resource ID**, which already contains the subscription and resource group. So two subscriptions (or two resource groups) can both have a VNet called `vnet-app`, because the full IDs are different and the VNet has no public DNS name.',
      '**Resources that are also globally unique (same reason: public DNS)**',
      '- **App Service / Function App**: Hostname: `<name>.azurewebsites.net` (new apps can use a unique default hostname with a random hash)\n- **Key Vault**: Hostname: `<name>.vault.azure.net`\n- **Container Registry**: Hostname: `<name>.azurecr.io`\n- **Azure SQL logical server**: Hostname: `<name>.database.windows.net`\n- **Cosmos DB account**: Hostname: `<name>.documents.azure.com`\n- **Service Bus / Event Hubs namespace**: Hostname: `<name>.servicebus.windows.net`',
      '**Tip:** naming convention like `st<app><env><region><suffix>` (for example `stpaymentsprodeus01`), and a random suffix in Terraform (`random_string`) for shared modules.',
      '**Interview-ready answer**',
      '"Because the storage account name becomes part of a public DNS name like name.blob.core.windows.net, and DNS names must be unique worldwide. Most other resources, like VNets or VMs, are identified by a resource ID that includes the subscription and resource group, so the same name can exist in different places. Any resource that gets a public hostname, such as Key Vault, ACR, App Service or SQL server, has the same global uniqueness rule."',
    ],
    code: [
      {
        title: 'Storage endpoints built from the account name',
        language: 'text',
        code: `https://<name>.blob.core.windows.net
https://<name>.file.core.windows.net
https://<name>.queue.core.windows.net
https://<name>.table.core.windows.net
https://<name>.dfs.core.windows.net`,
      },
      {
        title: 'A resource ID already contains subscription and resource group',
        language: 'text',
        code: `/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/vnet-app`,
      },
    ],
    tags: ['storage account', 'naming', 'dns', 'resource id', 'azure basics'],
  },
  {
    id: 'itv-rglb3-11',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      "The client's app depends on a Storage Account and must stay up even if the primary Azure region goes down. How would you design it?",
    probing:
      'Starting from RTO/RPO, then a full multi-region design: RA-GZRS plus data protection, two-region app from one IaC behind Front Door, regional Key Vault/private endpoints/DNS, database geo-replication, a failover runbook and drills.',
    answer: [
      'First agree the **RTO** (how long we can be down) and **RPO** (how much data we can lose) with the client. They decide how much redundancy, and cost, is needed.',
      '**Storage layer (data redundancy)**',
      '- **RA-GZRS**: zone-redundant in the primary region (survives a zone failure) **plus** a readable copy in the paired region. Use **RA-GRS** if the region has no zones.\n- **Soft delete, versioning, point-in-time restore** for blobs: protect against deletion or corruption (replication copies mistakes too).\n- **Object replication** to a separate account in region B if you need control over what is replicated, or a writable account in each region.',
      '**Application layer**',
      '- App deployed in **two regions** from the **same IaC** (active-active or active-passive).\n- **Azure Front Door** (HTTP) or **Traffic Manager** (DNS) with health probes routes users away from the failed region.\n- App reads from the **secondary endpoint** when the primary fails (SDK retry with secondary location), or switches the storage endpoint by configuration after failover.',
      '**Supporting services**',
      '- **Key Vault** in each region with the same secrets and roles.\n- **Private endpoints and private DNS** in both regions.\n- Database with geo-replication: **SQL auto-failover groups** or **Cosmos DB multi-region writes**.\n- **Managed identities** and roles set up in both regions.',
      '**Failover runbook (step by step)**',
      '1. Front Door probes and Azure Monitor / Service Health alerts detect the outage.\n2. Front Door moves traffic to region B automatically.\n3. Storage: the app reads from the secondary; if writes are needed, we check **Last Sync Time** and start **customer-managed failover**.\n4. After region A recovers: re-enable geo-redundancy, re-sync, and **fail back** in a maintenance window.',
      '**Business continuity**',
      '- Written **DR runbook** with owners; **DR drills** at least twice a year, measuring real RTO/RPO.\n- **Backups** outside the primary region; IaC to rebuild quickly.\n- **Trade-off:** active-active is fastest but costs more; active-passive (warm standby) is cheaper with a longer RTO.',
      '**Interview-ready answer**',
      '"I would first agree RTO and RPO. Then I\'d use RA-GZRS for the storage account, so it survives a zone failure and has a readable copy in the paired region, plus soft delete and versioning. The app runs in two regions from the same IaC, behind Front Door with health probes, so traffic moves automatically. The app reads from the secondary endpoint during an outage, and if we need writes I start a customer-managed failover after checking Last Sync Time. Key Vault, private endpoints and DNS exist in both regions, the database uses failover groups, and we test it all with regular DR drills."',
    ],
    code: [
      {
        title: 'Multi-region architecture',
        language: 'text',
        code: `                      Users
                        |
               Azure Front Door (WAF, health probes)
                 /                         \\
     Region A (primary)                Region B (secondary / paired)
     App Service / AKS                 App Service / AKS (same IaC)
     Key Vault A                       Key Vault B
     Private endpoints + DNS           Private endpoints + DNS
            \\                               /
             Storage account: RA-GZRS  -----> read-only secondary in Region B
             (zone-redundant in A,             (customer-managed failover for writes)
              async copy to B)
     Database: SQL failover group / Cosmos DB multi-region`,
      },
    ],
    traps: [
      'Treating geo-replication as backup - a deleted or corrupted blob is replicated too, so soft delete and versioning are still needed.',
      'Designing a second region without its own private endpoints, DNS records and Key Vault - the app fails over but cannot reach anything.',
    ],
    followUps: [
      'Active-active or active-passive: how do you choose, and what does each cost?',
      'How would the app handle writes while the storage account is read-only on the secondary?',
      'How do you run a DR drill without affecting production users?',
    ],
    tags: [
      'disaster recovery',
      'multi-region',
      'storage account',
      'ra-gzrs',
      'front door',
      'rto rpo',
    ],
  },
  {
    id: 'itv-rglb3-12',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The app team wants an application on a single VM, and users will access it through that VM. What are your next steps and action items?',
    probing:
      'Challenging the single point of failure, gathering requirements and SLA/RTO/RPO, then a secure-by-default build (no public IP, App Gateway/WAF, Bastion, managed identity, backup, patching, monitoring) and recommending a resilient alternative.',
    answer: [
      'First, **challenge the single VM**: it is a **single point of failure**. Then build it properly if the business accepts that risk.',
      '**1. Gather the requirements**',
      "- Users: **internal or internet**? How many? Which ports and protocols?\n- **OS**, app stack, CPU/memory/disk needs, licensing.\n- **Availability** need: a single VM's SLA is **99.9%** only with Premium SSD/Ultra disks on all disks (lower with Standard disks). Is that enough? What are the RTO/RPO?\n- Data: does the VM store data, or does it use a database / storage?\n- Compliance, budget, environment (dev/test/prod).",
      '**2. Design and build (with IaC: Terraform/Bicep)**',
      '- **Networking**: Action: VNet and subnet from the IP plan; **NSG** allowing only required ports; **no public IP on the VM**\n- **User access**: Action: Internet: **Application Gateway with WAF** (or Front Door) in front, with TLS certificate and DNS name. Internal: Load Balancer or private DNS name\n- **Admin access**: Action: **Azure Bastion** or JIT access; no open RDP/SSH to the internet\n- **Identity**: Action: Entra ID login for the VM, **managed identity** for the app to reach Key Vault, storage or DB\n- **Secrets**: Action: Key Vault, not in config files\n- **Disks and size**: Action: Right VM size, Premium SSD, data on a separate data disk\n- **Security**: Action: Hardened image, **encryption at host / disk encryption**, Defender for Servers, antimalware\n- **Patching**: Action: **Azure Update Manager** schedule\n- **Backup**: Action: **Azure Backup** policy, and test a restore\n- **Monitoring**: Action: Azure Monitor Agent, **VM Insights**, Log Analytics, alerts on CPU, memory, disk, heartbeat; app health probe\n- **Governance**: Action: Tags (owner, env, cost centre), naming, Azure Policy, budget alerts\n- **Deployment**: Action: App deployed by pipeline (or VM extension / Ansible), not by hand',
      '**3. Recommend a more resilient option**',
      '- **Two VMs** across **availability zones** behind a Load Balancer / App Gateway (**99.99%** SLA), or a **VM Scale Set**.\n- Or move the app to **PaaS** (App Service, Container Apps) if it fits.\n- At minimum: **Azure Site Recovery** to another region for DR.',
      '**4. Handover:** document the architecture, runbook, access, backup and restore steps; agree ownership and on-call.',
      '**Interview-ready answer**',
      "\"First I'd gather requirements: internal or external users, ports, OS, sizing, data, and the RTO and RPO, and I'd point out that one VM is a single point of failure with a 99.9% SLA at best. Then I'd build it with Terraform: VNet and NSG, no public IP, an Application Gateway with WAF and TLS in front for users, Bastion for admin access, managed identity and Key Vault for secrets, disk encryption, Defender, Update Manager for patching, Azure Backup and VM Insights with alerts. I'd recommend two VMs across zones or a scale set, or at least Site Recovery for DR.\"",
    ],
    code: [
      {
        title: 'Target layout for the single VM',
        language: 'text',
        code: `Users (internet) --> Application Gateway + WAF (TLS, DNS name)
                         |
                       VNet / subnet (NSG: only app port from App Gateway subnet)
                         |
                       VM (no public IP, managed identity, Premium SSD, AMA)
                         |-- Key Vault (secrets)
                         |-- Azure Backup / Update Manager / Defender for Servers
Admins -----------> Azure Bastion --> VM (no RDP/SSH open to the internet)`,
      },
    ],
    traps: [
      'Giving the VM a public IP and opening RDP/SSH "just for the team" - use Bastion or JIT instead.',
      'Promising 99.99% for one VM - that SLA needs two or more VMs across availability zones.',
    ],
    followUps: [
      'What changes if the app is stateful and cannot simply run on two VMs?',
      'How does Azure Site Recovery differ from Azure Backup for this VM?',
      'How would you patch the VM without downtime if there is only one instance?',
    ],
    tags: [
      'virtual machines',
      'architecture',
      'security',
      'high availability',
      'bastion',
      'application gateway',
    ],
  },
  {
    id: 'itv-rglb3-13',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'Have you worked with Classic pipelines? You need to run a Key Vault task against 10-20 Key Vaults. Build or Release pipeline, and how do you run it in parallel?',
    probing:
      'Choosing a Release pipeline, knowing Classic parallel stages ("After release" trigger) and multi-configuration multipliers, the YAML each-loop alternative, and capacity/RBAC/network prerequisites.',
    answer: [
      'Yes. I would choose a **Release pipeline**. Build pipelines are for compiling code and producing artifacts; Release pipelines are made to run the **same work against many targets**, each with its own variables, service connection and approvals.',
      '**Option 1: Classic Release with parallel stages**',
      '1. Create **one stage** with the task (Azure Key Vault task, or Azure CLI/PowerShell), using variables like `$(vaultName)`, not hard-coded names.\n2. **Clone** the stage for each vault.\n3. Set each stage\'s **trigger to "After release"** (not "After stage"), so **all stages start together**.\n4. Use **stage-scoped variables**: `vaultName`, `resourceGroup`, and the service connection per stage.\n5. Add **pre-deployment approvals** only on production vaults.',
      '**Option 2: one stage, multi-configuration (less clicking)**',
      'In the agent job, go to **Execution plan, then Parallelism, then Multi-configuration**:',
      '- **Multipliers:** `vaultName`\n- Variable `vaultName` = `kv-app1,kv-app2,kv-app3,...`\n- **Maximum number of agents:** for example 10',
      'The job runs once per vault, on several agents at the same time.',
      '**Option 3 (better long-term): multi-stage YAML with a list.** Jobs in one stage run **in parallel** by default. Adding a vault = adding one name to the list. (A `strategy: matrix` with `maxParallel` also works.)',
      '**Prerequisites for running in parallel**',
      '- Enough **parallel jobs** in the organization / agents in the pool. With 1 parallel job, everything queues one after another.\n- A service connection (preferably **workload identity federation**) with the right **RBAC role** on every vault.\n- **Self-hosted agents** in the VNet if the vaults use private endpoints or firewalls.\n- `continueOnError` or separate jobs, so one failing vault does not stop the others; check per-job logs.',
      '**Interview-ready answer**',
      "\"I'd use a Release pipeline, because it's meant to run the same deployment against many targets with their own variables and approvals. In Classic I'd create one stage with variables for the vault name, clone it per vault and set every stage to trigger after release so they all run in parallel, or use a multi-configuration job with vaultName as the multiplier and a max agent count. Today I'd do it in YAML with an `each` loop over a list of vaults, which creates parallel jobs. Parallel job capacity, RBAC on each vault and self-hosted agents for private vaults are the prerequisites.\"",
    ],
    code: [
      {
        title: 'Multi-stage YAML: one parallel job per vault',
        language: 'yaml',
        code: `parameters:
  - name: vaults
    type: object
    default: [kv-app1, kv-app2, kv-app3]

stages:
  - stage: KeyVaultTasks
    jobs:
      - \${{ each vault in parameters.vaults }}:
          - job: kv_\${{ replace(vault, '-', '_') }}
            pool:
              vmImage: ubuntu-latest
            steps:
              - task: AzureCLI@2
                inputs:
                  azureSubscription: sc-keyvault-ops
                  scriptType: bash
                  scriptLocation: inlineScript
                  inlineScript: |
                    echo "Running against \${{ vault }}"
                    az keyvault secret list --vault-name \${{ vault }} -o table`,
      },
    ],
    traps: [
      'Leaving the cloned stages on "After stage" triggers - they then run one after another, not in parallel.',
      'Forgetting the organization has only one parallel job - the pipeline is "parallel" on paper but everything queues.',
    ],
    followUps: [
      'How would you do the same with a `strategy: matrix` and limit concurrency?',
      'How do you stop one failing vault from blocking the others while still reporting the failure?',
      'How do you grant the service connection access to 20 vaults without 20 manual role assignments?',
    ],
    tags: [
      'azure devops',
      'classic pipelines',
      'release pipelines',
      'parallel jobs',
      'key vault',
      'yaml pipelines',
    ],
  },
  {
    id: 'itv-rglb3-14',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What common SRE issues have you handled?',
    probing:
      'A broad, concrete list across availability, resources, networking, identity, pipelines, dependencies, alert noise and cost, plus a disciplined incident loop that mitigates first.',
    answer: [
      'This is a project-style sample: change the details to match what you really did.',
      '- **Availability**: Typical issues: 5xx spikes after a release, failed health probes; How I fixed them: Roll back or swap slots back first, then root cause\n- **Resource exhaustion**: Typical issues: High CPU/memory, full disks, pods `OOMKilled` / `CrashLoopBackOff`; How I fixed them: Right-sizing, requests/limits, HPA and cluster autoscaler, disk clean-up and alerts\n- **Networking and DNS**: Typical issues: Private endpoint and firewall problems, DNS resolving to public IPs, expired or wrong TLS certificates; How I fixed them: DNS zone links, firewall rules, certificate automation and expiry alerts\n- **Identity and secrets**: Typical issues: 401/403 from Key Vault, expired client secrets; How I fixed them: Managed identities, correct RBAC, expiry alerts and rotation\n- **Pipelines**: Typical issues: Failed deployments, agent capacity, wrong variables; How I fixed them: Retries, approvals, parameterised templates, more agents\n- **Dependencies**: Typical issues: Slow database or third-party API; How I fixed them: Timeouts, retries with backoff, circuit breakers, caching\n- **Alert noise**: Typical issues: Too many alerts, real ones ignored; How I fixed them: Alert tuning, severity levels, dynamic thresholds, alert processing rules\n- **Cost**: Typical issues: Idle and oversized resources; How I fixed them: Tagging, right-sizing, schedules, reservations',
      '**My incident loop:** detect, triage, **mitigate first**, find root cause, then a **blameless post-incident review** with action items.',
      '**Interview-ready answer**',
      '"I\'ve handled 5xx spikes after releases, which I mitigate by rolling back or swapping slots first; resource problems like OOMKilled pods and full disks, fixed with right-sizing and autoscaling; networking and DNS issues with private endpoints and expired certificates; Key Vault 403s and expired secrets, fixed with managed identities and rotation; pipeline failures; and noisy alerts. For each I follow the same loop: mitigate first, find the root cause, then a blameless review with action items so it doesn\'t repeat."',
    ],
    code: [
      {
        title: 'Incident loop',
        language: 'text',
        code: `detect -> triage -> mitigate first -> root cause -> blameless post-incident review (action items)`,
      },
    ],
    followUps: [
      'Walk me through one of those incidents in detail: timeline, mitigation and root cause.',
      'How do you decide between rolling back and fixing forward?',
      'What goes into a good blameless post-incident review?',
    ],
    tags: ['sre', 'incident management', 'troubleshooting', 'reliability'],
  },
  {
    id: 'itv-rglb3-15',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain the SRE goals: SLI, SLO, SLA and error budget.',
    probing:
      'Clear definitions with examples, the SLO being stricter than the SLA, and the error budget as a release decision tool.',
    answer: [
      '- **SLI** (Service Level Indicator): Meaning: A **measurement** of service health; Example: % of successful requests; % of requests under 300 ms\n- **SLO** (Service Level Objective): Meaning: Our **internal target** for an SLI over a time window; Example: 99.9% of requests succeed over 30 days\n- **SLA** (Service Level Agreement): Meaning: A **contract** with the customer, with penalties (for example service credits) if missed; Example: 99.5% monthly availability\n- **Error budget**: Meaning: Allowed unreliability = **100% - SLO**; Example: 0.1% of requests may fail (43.2 min/month)',
      '**How the four terms connect**',
      '- The **SLO is stricter than the SLA**, so we get a warning before breaching the contract.\n- The **error budget** turns reliability into a **decision tool** between speed and stability:\n  - **Budget left:** ship features, take reasonable release risk.\n  - **Budget nearly used:** freeze risky releases, focus on reliability work.\n- **Burn-rate alerts** tell us how fast we are using the budget.',
      '**Good SLIs:** user-facing, measured where users feel it: **availability** (successful requests / total), **latency** (p95/p99), **error rate**, **freshness** for data pipelines.',
      '**Interview-ready answer**',
      '"An SLI is what we measure, like the percentage of successful requests. An SLO is our internal target for it, like 99.9% over 30 days. An SLA is the contract with the customer, with penalties, and it\'s always looser than the SLO so we get early warning. The error budget is 100% minus the SLO. It balances speed and reliability: while we have budget we ship, and when it\'s nearly used we pause risky changes and fix reliability."',
    ],
    code: [
      {
        title: 'How SLI, SLO, SLA and error budget connect',
        language: 'text',
        code: `SLI (what we measure) --> compared with --> SLO (our target)  -->  tighter than  -->  SLA (customer promise)
                                              |
                                        Error budget = 100% - SLO`,
      },
    ],
    traps: [
      'Setting the SLO equal to the SLA - you then only learn about a problem once the contract is already breached.',
    ],
    tags: ['sre', 'sli', 'slo', 'sla', 'error budget'],
  },
  {
    id: 'itv-rglb3-16',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you calculate MTTR?',
    probing:
      'The formula with a worked example, measuring until users are restored rather than root cause fixed, and the related MTTD/MTTA/MTBF and DORA metrics.',
    answer: [
      '**MTTR (Mean Time To Restore/Recover)** = the average time to restore service after an incident: `MTTR = Total downtime across incidents / Number of incidents`.',
      'Downtime is measured from when the incident **started (or was detected)** until service was **restored** for users, not until the root cause was fixed.',
      '**Example:** three incidents lasted 30, 45 and 15 minutes.',
      '- Total = 90 minutes\n- MTTR = 90 / 3 = **30 minutes**',
      '**Related incident metrics**',
      '- **MTTD** (detect): Meaning: Start of the problem to alert/detection\n- **MTTA** (acknowledge): Meaning: Alert to an engineer acknowledging\n- **MTTR** (restore): Meaning: Start to service restored\n- **MTBF** (between failures): Meaning: Average uptime between incidents',
      'MTTR is also one of the four **DORA** metrics (as "failed deployment recovery time").',
      '**Interview-ready answer**',
      '"MTTR is total downtime divided by the number of incidents. If three incidents lasted 30, 45 and 15 minutes, that\'s 90 minutes over 3, so an MTTR of 30 minutes. I measure from when the impact started until users are restored, not until the root cause is fixed, and I also track MTTD and MTTA, because detection and acknowledgement are often the biggest part."',
    ],
    code: [
      {
        title: 'MTTR formula and example',
        language: 'text',
        code: `MTTR = Total downtime across incidents / Number of incidents

Incidents: 30 + 45 + 15 = 90 minutes
MTTR     = 90 / 3       = 30 minutes`,
      },
    ],
    tags: ['sre', 'mttr', 'dora', 'incident management'],
  },
  {
    id: 'itv-rglb3-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you reduce MTTR?',
    probing:
      'Attacking every stage of the incident timeline (detect, acknowledge, diagnose, mitigate), mitigating before root cause, automation and learning from post-incident reviews.',
    answer: [
      'Reduce each part of the incident timeline: **detect, acknowledge, diagnose, mitigate**.',
      '- **Detect faster**: How I reduced it: Alerts on **symptoms** users feel (error rate, latency, availability tests), with good thresholds\n- **Acknowledge faster**: How I reduced it: Clear on-call rota, action groups to Teams/phone/PagerDuty, severity levels\n- **Diagnose faster**: How I reduced it: **Runbooks** and dashboards/workbooks per service, distributed tracing (Application Insights), correlated logs, recent-change view\n- **Mitigate first, fix later**: How I reduced it: **Rollback**, slot swap back, scale out, **feature flags**, failover, before root-cause analysis\n- **Automate**: How I reduced it: Auto-restart, autoscaling, self-healing probes, automated rollback on failed smoke tests, runbook automation\n- **Learn**: How I reduced it: Blameless **post-incident reviews** with tracked action items; game days to practise',
      '**Interview-ready answer**',
      '"I reduce MTTR at every stage. We detect faster with alerts on user-facing symptoms and availability tests, acknowledge faster with a clear on-call rota and action groups, and diagnose faster with runbooks, workbooks and tracing. Most importantly, we mitigate first: roll back, swap slots, scale out or flip a feature flag, then find the root cause. Automation like self-healing probes and automatic rollback removes human delay, and post-incident reviews stop repeats."',
    ],
    code: [
      {
        title: 'Incident timeline - shrink every segment',
        language: 'text',
        code: `impact starts -> detected (MTTD) -> acknowledged (MTTA) -> diagnosed -> mitigated / restored (MTTR)
                   alerts              on-call, action groups   runbooks,    rollback, slot swap,
                                                                tracing      feature flag, failover`,
      },
    ],
    traps: [
      'Insisting on finding the root cause before restoring service - mitigate first, then investigate.',
    ],
    followUps: [
      'Give an example where a feature flag or slot swap cut an incident short.',
      'How do you automate rollback when post-deployment smoke tests fail?',
      'What is a game day and how do you run one?',
    ],
    tags: ['sre', 'mttr', 'incident management', 'automation', 'runbooks'],
  },
  {
    id: 'itv-rglb3-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do alerts help reduce incident time and production downtime?',
    probing:
      'Alerts shorten detection and diagnosis, reach the right people with context via action groups, stay actionable through noise control, trigger auto-remediation, and catch trends before an outage.',
    answer: [
      'Detection and diagnosis are usually the **longest** parts of an incident. Good alerts shorten both.',
      '- **Faster detection:** Azure Monitor alerts notify the on-call within minutes, **before users report it**.\n- **Right people, right context:** **action groups** send email, Teams, SMS or paging; the alert includes the resource, the query and links to the **runbook** and **workbook**.\n- **Less noise:** severity levels, **dynamic thresholds**, and **alert processing rules** (suppress during maintenance, route by team), so real alerts get attention.\n- **Quicker diagnosis:** log alerts with KQL point to where the failure is: app, dependency or network.\n- **Auto-remediation:** alerts trigger **Logic Apps, Automation runbooks or Functions** to restart, scale or clear disk.\n- **Proactive:** alerts on trends (disk 80%, certificate expiry) prevent the outage completely.',
      '**Interview-ready answer**',
      '"Alerts cut the time to detect and diagnose, which is usually most of the downtime. Azure Monitor alerts reach the on-call engineer through action groups within minutes, with links to the runbook and workbook. I keep them actionable with severities, dynamic thresholds and alert processing rules, and some alerts trigger automation to restart or scale on their own. Trend alerts like disk at 80% or a certificate expiring in 30 days stop the incident before it happens."',
    ],
    code: [
      {
        title: 'KQL: log alert query on 5xx rate',
        language: 'text',
        code: `requests
| where timestamp > ago(5m)
| summarize Total = count(), Errors = countif(toint(resultCode) >= 500)
| extend ErrorPct = 100.0 * Errors / Total
| where ErrorPct > 5`,
      },
    ],
    traps: [
      'More alerts is not better - noisy, non-actionable alerts train the team to ignore the real ones.',
    ],
    followUps: [
      'What is the difference between an action group and an alert processing rule?',
      'When would you use dynamic thresholds instead of a static threshold?',
      'How would you wire an alert to an Automation runbook for self-healing?',
    ],
    tags: ['azure monitor', 'alerts', 'action groups', 'sre', 'auto-remediation'],
  },
]
