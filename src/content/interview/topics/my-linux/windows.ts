import type { InterviewQuestion } from '../../../types'

/** Windows Server operations questions. */
export const myWindowsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mylnx-114',
    level: 'basic',
    kind: 'open',
    prompt: 'What Windows Server tasks have you handled?',
    probing:
      'Whether you can back up Windows experience with a concrete incident rather than a list of tools.',
    answer: [
      'Typical work includes user and group access, services, Event Viewer, IIS, scheduled tasks, patching, Windows Firewall, disks, RDP, certificates, backups, and PowerShell automation. Instead of just listing tools, I like to walk through a real incident.',
      "Example: an IIS application started returning 503 errors. I confirmed the scope from the load balancer, checked the application-pool state and Event Viewer, and found the service account's password had expired. I rotated it through the approved process, updated the pool identity, and restarted only that pool.",
      'I checked the health endpoint and a real transaction worked, watched for errors afterward, and prevented it happening again by switching to a managed service account with a credential-expiry alert.',
    ],
    tags: ['windows', 'experience', 'iis'],
  },
  {
    id: 'itv-mylnx-115',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you check Windows service status?',
    probing:
      'Whether you can query service state, start mode and identity, and investigate before restarting.',
    answer: [
      "`Get-Service` gives a quick status check; the CIM query adds the startup account and binary path. If a service is stopped, I don't just restart it blindly.",
      'I check dependent services, any recent changes, the System and Application logs, the executable path, the service account, permissions, ports, and whether resources are under pressure.',
      'After a controlled start, I verify the `Status`, the listening port, application health, and monitoring. If it keeps failing, I look at the service-specific log and exit code instead of restarting it over and over.',
    ],
    code: [
      {
        title: 'Service status and configuration',
        language: 'powershell',
        code: `Get-Service -Name W3SVC
Get-CimInstance Win32_Service -Filter "Name='W3SVC'" |
    Select-Object Name, State, StartMode, StartName, PathName`,
      },
    ],
    tags: ['windows', 'services', 'powershell'],
  },
  {
    id: 'itv-mylnx-116',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you restart a Windows service with PowerShell?',
    probing:
      'Whether you restart with error handling and a wait, and treat production restarts as controlled changes.',
    answer: [
      "Before restarting a production service, I check the impact, get approval, confirm there's redundancy, and know how I'd roll back. I drain the node from the load balancer if needed and grab the relevant logs first, since a restart can wipe out evidence of what went wrong.",
      'Afterward I test the port, the health endpoint, dependencies, and the error rate. If it fails again, I stop retrying and look into the configuration, credentials, a missing dependency, or resource exhaustion instead.',
    ],
    code: [
      {
        title: 'Restart and wait for Running',
        language: 'powershell',
        code: `$service = Get-Service -Name W3SVC -ErrorAction Stop
Restart-Service -InputObject $service -ErrorAction Stop
$service.WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
Get-Service -Name W3SVC`,
      },
    ],
    tags: ['windows', 'services', 'powershell'],
  },
  {
    id: 'itv-mylnx-117',
    level: 'basic',
    kind: 'open',
    prompt: 'Where do you check Windows logs?',
    probing:
      'Whether you know the main event channels and can filter events by time and level with PowerShell.',
    answer: [
      'I use Event Viewer or PowerShell. The main channels are Application, System, Security, Setup, and any service-specific logs under Applications and Services Logs.',
      'I filter by the incident time, provider, event ID, hostname, and any correlation data, then compare it against recent changes. Across multiple servers I centralize logs in a SIEM or Log Analytics platform and keep the clocks in sync.',
      "I save the relevant events before any cleanup happens, and I don't treat every warning as the root cause.",
    ],
    code: [
      {
        title: 'Critical, error and warning System events from the last two hours',
        language: 'powershell',
        code: `Get-WinEvent -FilterHashtable @{
  LogName='System'
  Level=1,2,3
  StartTime=(Get-Date).AddHours(-2)
} | Select-Object TimeCreated, Id, ProviderName, LevelDisplayName, Message`,
      },
    ],
    tags: ['windows', 'logs', 'powershell'],
  },
  {
    id: 'itv-mylnx-118',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot high CPU on Windows?',
    probing:
      'Whether you find the process (including which IIS app pool), capture evidence and fix the cause.',
    answer: [
      'I confirm whether the CPU load is sustained and whether users are actually affected, then find the process using Task Manager, Resource Monitor, Performance Monitor, or PowerShell.',
      "I compare the process's CPU usage against request rate, scheduled tasks, antivirus activity, updates, application logs, thread count, and any recent releases. For IIS, I identify which application pool `w3wp.exe` belongs to.",
      'Where possible, I capture a dump or performance trace before restarting anything.',
      'The actual fix might be correcting bad code or a slow query, a configuration change, scaling the workload, or stopping a runaway task. Afterward I confirm response time and CPU are back to normal and add an alert with a runbook for next time.',
    ],
    code: [
      {
        title: 'Top CPU processes',
        language: 'powershell',
        code: `Get-Process | Sort-Object CPU -Descending |
  Select-Object -First 10 Name, Id, CPU, WorkingSet`,
      },
    ],
    tags: ['windows', 'cpu', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-119',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you troubleshoot disk-full issues on Windows?',
    probing:
      'Whether you find what is growing, avoid deleting unknown files and prevent recurrence.',
    answer: [
      "I find the full volume and what's filling it using Storage settings, an approved tool like TreeSize, or PowerShell. I check IIS logs, temp directories, crash dumps, the Windows Update cache, backups, and application data.",
      "I don't delete files I don't recognize. First I stop or control whatever is producing the growth, archive or rotate the logs that support it, and clean up approved temporary data.",
      'If a large deleted file is still holding space because a process has it open, I find that process. If the growth is legitimate, I extend the disk or filesystem after checking the backup and platform limits.',
      "After recovering space, I restart only the affected services, confirm there's free space and the application is writing normally, and prevent it recurring with retention policies, quotas, capacity alerts, and clear ownership of directories that tend to grow.",
    ],
    tags: ['windows', 'disk', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-120',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you schedule tasks in Windows?',
    probing:
      'Whether you define identity, trigger, action and failure handling, and test under the real account.',
    answer: [
      'I use Task Scheduler or `Register-ScheduledTask`, and define the exact identity, trigger, action, working directory, timeout, retry behavior, and failure logging.',
      "The service account only gets the permissions it actually needs, with managed credentials where possible. I test it manually under the same identity, since it running fine interactively doesn't prove it will run fine on a schedule.",
      'I check the run history, exit code, logs, whether overlapping runs are handled, what happens to a missed run, and that alerts are in place.',
    ],
    code: [
      {
        title: 'Register a daily scheduled task',
        language: 'powershell',
        code: `$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' \`
  -Argument '-NoProfile -File C:\\Ops\\cleanup.ps1'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName 'ApprovedCleanup' \`
  -Action $action -Trigger $trigger -User 'DOMAIN\\svc-ops'`,
      },
    ],
    tags: ['windows', 'scheduled tasks', 'powershell'],
  },
  {
    id: 'itv-mylnx-121',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you patch Windows servers safely?',
    probing:
      'Whether you run patching as staged rings with validation, redundancy-aware draining and a rollback plan.',
    answer: [
      'My process is: inventory and risk review, then a backup/recovery check, a test ring, staged production rings, and validation. I use WSUS, Configuration Manager, Azure Update Manager, or another governed platform to run it.',
      'Before patching, I check dependencies, how the cluster or load balancer will behave, disk space, whether a reboot is already pending, maintenance approval, and how hard it would be to roll back.',
      'I drain one redundant node, install the approved updates, reboot it, and check its services, ports, application transactions, monitoring, and event logs before moving on to the next node.',
      'If something fails, I stop the rollout, preserve the evidence, follow the documented uninstall, restore, or failover steps, and communicate the impact. Patch compliance, exceptions, reboot status, and any post-patch incidents all get recorded and reviewed afterward.',
    ],
    followUps: [
      'How would you handle a server that cannot tolerate a reboot window?',
      'How do you report patch compliance across the fleet?',
    ],
    tags: ['windows', 'patching'],
  },
]
