import type { InterviewQuestion } from '../../../types'

/** Virtual machines, availability options and scale sets. */
export const azureComputeVmQuestions: InterviewQuestion[] = [
  {
    id: 'itv-azc-1',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do you choose a VM size in Azure? Read me the name Standard_D4ds_v5 and tell me what each part means.',
    probing:
      'Practical sizing literacy: families by workload shape, the naming convention, and checking regional and zonal availability before committing.',
    answer: [
      'I start from the **workload shape**, then pick the family. **B-series** is burstable - cheap for low average CPU with occasional spikes, like small dev boxes. **D-series** is general purpose, a balanced CPU-to-memory ratio for most apps. **E-series** is memory optimised, for databases and caches. **F-series** is compute optimised. **L-series** has large, fast local NVMe for storage-heavy workloads, **N-series** has GPUs, and **M-series** is very large memory for SAP HANA-class systems.',
      'The name encodes the details. In `Standard_D4ds_v5`: **D** is the family, **4** is the number of vCPUs, **d** means it has a **local temporary disk**, **s** means it supports **premium SSD** storage, and **v5** is the hardware generation. Other letters you will see are **a** for AMD processors, **p** for Arm-based processors, **l** for lower memory and **m** for more memory per vCPU.',
      'Then I check it is **available** where I need it - in the region and in every zone I plan to use - and has **quota** in my subscription. And I right-size with data: Azure Advisor and VM insights show real CPU and memory use after a couple of weeks, and newer generations are often both faster and cheaper than the size that was chosen three years ago.',
    ],
    code: [
      {
        title: 'Is the size available in every zone, and do I have quota?',
        language: 'bash',
        code: `az vm list-skus -l uksouth --resource-type virtualMachines --size Standard_D4ds_v5 \\
  --query "[].{name:name, zones:locationInfo[0].zones, restricted:restrictions[].reasonCode}" -o jsonc

az vm list-usage -l uksouth --query "[?contains(name.value, 'DDSv5')]" -o table

# Resize - a size in the same hardware cluster may not need a deallocate
az vm list-vm-resize-options -g rg-app -n vm-app-01 -o table
az vm resize -g rg-app -n vm-app-01 --size Standard_D8ds_v5`,
      },
    ],
    diagrams: [
      {
        kind: 'decision',
        title: 'Which VM family?',
        caption: 'Pick by workload shape, then confirm with real utilisation data.',
        question: 'What does the workload need most?',
        branches: [
          {
            condition: 'Low average CPU, occasional spikes',
            result: 'B-series',
            detail: 'Burstable',
          },
          {
            condition: 'Balanced web and app servers',
            result: 'D-series',
            detail: 'General purpose',
            tone: 'accent',
          },
          { condition: 'Lots of RAM per core', result: 'E-series', detail: 'Databases, caches' },
          { condition: 'Fast local NVMe', result: 'L-series', detail: 'Storage optimised' },
          { condition: 'GPU', result: 'N-series', detail: 'AI, rendering', tone: 'warning' },
        ],
      },
    ],
    traps: [
      'Storing data on the temporary disk - it is lost on redeploy, resize or host maintenance.',
      'Choosing B-series for production workloads with sustained CPU, which run out of credits and throttle.',
      'Assuming a size exists in every zone of a region.',
    ],
    followUps: [
      'What happens to the temporary disk when a VM is deallocated?',
      'How do B-series CPU credits work?',
    ],
    tags: ['virtual machines', 'vm sizes', 'compute', 'basics'],
  },
  {
    id: 'itv-azc-2',
    level: 'basic',
    kind: 'mcq',
    prompt:
      'You put two VMs in an availability set with two fault domains. Which failure does that design protect against?',
    options: [
      { id: 'a', text: 'A power or network failure in a single server rack' },
      { id: 'b', text: 'A fire that takes an entire datacenter offline' },
      { id: 'c', text: 'An outage of the whole Azure region' },
      { id: 'd', text: 'A bad application release deployed to both VMs' },
    ],
    correct: ['a'],
    probing:
      'Knowing the size of each failure domain, and that infrastructure redundancy does nothing for bad deployments.',
    answer: [
      'An availability set spreads VMs across **fault domains** - separate racks with their own power and network switch - and **update domains**, so planned maintenance does not reboot them all at once. It protects against a **rack** failure and host maintenance.',
      'All fault domains are inside **one datacenter**, so a datacenter fire needs **availability zones**, and a regional outage needs a **second region**. And no infrastructure option protects against deploying a broken release to every instance - that needs rolling deployments and health checks.',
    ],
    code: [
      {
        title: 'See where each VM landed',
        language: 'bash',
        code: `az vm get-instance-view -g rg-app -n vm-app-01 \\
  --query "{fd:instanceView.platformFaultDomain, ud:instanceView.platformUpdateDomain}"`,
      },
    ],
    traps: ['Calling an availability set protection against datacenter failure.'],
    followUps: ['Why is an availability set largely replaced by VMSS Flexible with zones today?'],
    tags: ['availability sets', 'fault domains', 'availability zones'],
  },
  {
    id: 'itv-azc-3',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Explain Virtual Machine Scale Sets and autoscale. What is the difference between Uniform and Flexible orchestration, and how do you avoid flapping?',
    probing:
      'Hands-on VMSS knowledge: orchestration modes, autoscale rules that behave, scale-in policies and upgrade modes.',
    answer: [
      'A **scale set** manages a group of VMs as one: it creates them from one model, spreads them across fault domains or zones, and scales the count up and down. **Flexible orchestration** is the recommended mode now: instances are normal VMs you can manage individually, you can mix sizes including spot, and it is the way to spread across zones with high availability. **Uniform** is the older mode of identical instances managed only through the scale set API; it is still used by some services and very large homogeneous fleets.',
      '**Autoscale** in Azure Monitor adjusts the instance count with rules - scale out when average CPU exceeds 70% for 10 minutes, scale in when it is below 30% for 10 minutes - plus minimum, maximum and default counts, and schedules for predictable peaks.',
      '**Flapping** is scaling out, which lowers the average, which triggers a scale-in, which raises the average, and so on. I avoid it by leaving a **wide gap** between scale-out and scale-in thresholds, using longer windows for scale-in than scale-out, adding **cool-down** periods, and scaling in by one instance at a time. Azure autoscale also predicts the post-scale-in metric and skips a scale-in that would immediately trigger scale-out.',
      'I also set a **scale-in policy** - for example remove the newest VMs first, or balance across zones - and enable **automatic instance repairs** with an application health probe, so unhealthy instances are replaced rather than just counted.',
    ],
    code: [
      {
        title: 'Autoscale with asymmetric rules',
        language: 'bash',
        code: `az monitor autoscale create -g rg-web --resource vmss-web-prod \\
  --resource-type Microsoft.Compute/virtualMachineScaleSets \\
  --name as-vmss-web --min-count 3 --max-count 12 --count 3

# Scale out quickly
az monitor autoscale rule create -g rg-web --autoscale-name as-vmss-web \\
  --condition "Percentage CPU > 70 avg 10m" --scale out 2 --cooldown 5

# Scale in slowly, one at a time
az monitor autoscale rule create -g rg-web --autoscale-name as-vmss-web \\
  --condition "Percentage CPU < 30 avg 20m" --scale in 1 --cooldown 15`,
      },
      {
        title: 'Health-based repairs and a scale-in policy',
        language: 'bash',
        code: `az vmss update -g rg-web -n vmss-web-prod \\
  --enable-automatic-repairs true --automatic-repairs-grace-period 30 \\
  --scale-in-policy NewestVM`,
        explanation:
          'Automatic repairs need an application health signal - the Application Health extension or a load balancer probe.',
      },
    ],
    diagrams: [
      {
        kind: 'flow',
        title: 'An autoscale decision',
        caption: 'Asymmetric thresholds and cool-downs are what stop flapping.',
        nodes: [
          { label: 'Metric window evaluated', detail: 'Avg CPU over 10 minutes' },
          { label: 'Rule matches: CPU above 70%', tone: 'accent' },
          { label: 'Scale out by 2 within max', detail: 'Zones balanced' },
          { label: 'Cool-down 5 minutes', detail: 'No further action', tone: 'muted' },
          {
            label: 'Scale-in check predicts result',
            branch: { label: 'Would re-trigger out', detail: 'Skipped', tone: 'warning' },
          },
          { label: 'Steady state', tone: 'success' },
        ],
      },
    ],
    traps: [
      'Symmetric thresholds like out above 50%, in below 50%.',
      'Scaling on CPU for a workload bound by queue length or connections.',
      'No health probe, so broken instances count as capacity.',
    ],
    followUps: [
      'How do upgrade policies - manual, rolling, automatic - differ?',
      'When would you scale on a custom metric such as queue depth?',
    ],
    tags: ['vmss', 'autoscale', 'scale sets', 'compute'],
  },
  {
    id: 'itv-azc-21',
    level: 'intermediate',
    kind: 'mcq',
    prompt:
      'In AKS, the Horizontal Pod Autoscaler raises a deployment to 40 replicas, but 15 pods stay Pending with "Insufficient cpu". What adds the capacity?',
    options: [
      { id: 'a', text: 'The Horizontal Pod Autoscaler, once it notices the Pending pods' },
      { id: 'b', text: 'The cluster autoscaler, which adds nodes when pods cannot be scheduled' },
      { id: 'c', text: 'The Vertical Pod Autoscaler, which moves pods to bigger nodes' },
      { id: 'd', text: 'Azure Monitor autoscale rules on the node pool’s CPU metric' },
    ],
    correct: ['b'],
    probing:
      'The two-layer scaling model in Kubernetes: pods versus nodes, and what each reacts to.',
    answer: [
      'The **cluster autoscaler** adds nodes. It watches for pods that are **unschedulable** because no node has room for their resource **requests**, and scales the node pool up, within its min and max counts. It scales down when nodes are underused and their pods fit elsewhere.',
      'The HPA only changes the **replica count**; it cannot create capacity. The VPA changes pod **requests**, not nodes. And AKS node pools are not scaled by Azure Monitor autoscale rules on node CPU - the cluster autoscaler reacts to scheduling, not utilisation, which is exactly why pods must have sensible requests.',
    ],
    code: [
      {
        title: 'Enable the cluster autoscaler on a node pool',
        language: 'bash',
        code: `az aks nodepool update -g rg-aks -n userpool --cluster-name aks-shop-prod \\
  --enable-cluster-autoscaler --min-count 3 --max-count 20

kubectl get pods --field-selector=status.phase=Pending
kubectl describe pod <pod-name> | grep -A3 Events`,
        placeholders: ['<pod-name>'],
      },
    ],
    traps: ['Expecting the cluster autoscaler to react to high node CPU.'],
    followUps: ['Why do missing resource requests break the cluster autoscaler?'],
    tags: ['aks', 'cluster autoscaler', 'hpa', 'scaling'],
  },
]
