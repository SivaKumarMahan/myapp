import type { InterviewQuestion } from '../../../types'

/** Linux summary and notes material: command areas, filesystem hierarchy, tooling and scenarios. */
export const myLinuxNotesQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mylnx-75',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the core areas of Linux operations, and why does Linux matter in DevOps?',
    probing:
      'Whether you can frame the everyday Linux skill set a DevOps engineer needs and why it is command-line driven.',
    answer: [
      'Linux is widely used for production servers, container hosts and cloud workloads, although Windows and other operating systems also remain important. DevOps engineers need command-line investigation skills because most servers are managed remotely without a graphical interface.',
      '- **Files/navigation:** `pwd`, `ls`, `cd`, `mkdir`, `cp`, `mv`, `touch`, `cat`, `less`, and cautious removal.\n- **System information:** date/time, uptime/load, logged-in users, kernel/CPU/memory, filesystem and directory usage.\n- **Processes:** `ps`, `top`, `pidstat`, signals, process states, parent/child relationships, and service ownership.\n- **Permissions:** owner/group/other, read/write/execute, `chmod`, `chown`, ACLs, `sudo`, and safe account management.\n- **Archives:** `tar` create/list/extract with gzip/bzip2/xz where appropriate.\n- **Networking:** DNS, route, TCP/TLS, SSH, listening sockets, and packet/path investigation.\n- **Services/logs:** `systemd` status/start/stop/reload, `journalctl`, application logs, log rotation, and boot history.',
      'The areas that come up daily in production are process management, networking, filesystem navigation, permissions, disk usage, search and filtering, package management, system configuration, monitoring, and service management.',
    ],
    tags: ['linux', 'fundamentals'],
  },
  {
    id: 'itv-mylnx-76',
    level: 'basic',
    kind: 'open',
    prompt: 'What does an operating system do, and what are Type 1 and Type 2 hypervisors?',
    probing:
      'Whether you understand the OS role and virtualization basics, and that a VM snapshot is not a backup.',
    answer: [
      'An operating system sits between applications and hardware. It schedules processes, manages physical and virtual memory, provides filesystems and device drivers, and enforces identity and access controls.',
      'Linux is common in servers, containers, cloud platforms and automation because it is scriptable, stable and supported by a large open-source ecosystem.',
      'Virtualization lets multiple isolated virtual machines share one physical host.',
      '- A **Type 1 hypervisor** runs directly on hardware. Examples include VMware ESXi and Hyper-V in its bare-metal role.\n- A **Type 2 hypervisor** runs as an application on a host OS. Examples include VirtualBox and VMware Workstation.',
      'VMs give OS-level isolation and can be snapshotted, but a snapshot is not an independent backup. Before relying on a VM snapshot for deployment protection, confirm application consistency, retention, storage impact and restore behavior.',
      'Production recovery still needs backups kept somewhere that would not fail along with the primary system, plus tested restoration.',
    ],
    tags: ['virtualization', 'fundamentals'],
  },
  {
    id: 'itv-mylnx-77',
    level: 'basic',
    kind: 'open',
    prompt: 'Explain the Linux filesystem hierarchy.',
    probing:
      'Whether you know what the standard top-level directories hold and how to inspect mounts.',
    answer: [
      "- **`/`**: root of the filesystem hierarchy\n- **`/boot`**: bootloader, kernel and boot-related files\n- **`/dev`**: device nodes\n- **`/etc`**: system and service configuration\n- **`/home`**: regular users' home directories\n- **`/opt`**: optional or third-party application trees\n- **`/run`**: volatile runtime state\n- **`/tmp`**: temporary files; cleanup behavior is distribution-specific\n- **`/usr`**: most user-space programs, libraries and shared data\n- **`/var`**: variable data such as logs, queues, caches and databases",
      'Modern distributions often merge `/bin`, `/sbin` and `/lib` into `/usr` using symbolic links. Common local filesystems include ext4, XFS and Btrfs. The best choice depends on distribution support, workload, and your recovery and snapshot requirements.',
      'Do not assume `/tmp` is always cleared on reboot, and do not manually delete unfamiliar content from `/var` to solve disk pressure.',
    ],
    code: [
      {
        title: 'Inspect mounts and devices',
        language: 'bash',
        code: `findmnt
lsblk -f
df -hT
df -i`,
      },
    ],
    tags: ['filesystem', 'fundamentals'],
  },
  {
    id: 'itv-mylnx-78',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'What do you check first in common Linux production scenarios: disk full, slowness, an unresponsive system, a config change not applying, or a permission change?',
    probing:
      'Whether you have a repeatable checklist per scenario and treat kills and reboots as containment, not fixes.',
    answer: [
      "- **Disk at 100%**: filesystem and inode pressure, the largest directories and files, files that are deleted but still held open by a process, log or journal growth, package or container caches, and which application owns the growth. Free only data you've confirmed is safe to remove, restore some headroom, then add retention and capacity alerts.\n- **Slowness or high CPU**: load average, CPU mode breakdown, memory and swap, I/O wait, disk latency, network, the top processes and threads, application logs, recent changes, traffic, and dependencies. Only kill a process or reboot after identifying the cause and the risk — treat it as containment, not a fix.\n- **Unresponsive system**: use console or out-of-band access. Check load, processes stuck in `D` state, memory pressure and OOM events, I/O, kernel logs, the filesystem, and hardware or cloud platform health.\n- **Configuration change not taking effect**: validate syntax, confirm which config path is actually active, compare the rendered configuration against the live one, reload or restart safely, then check service logs.\n- **User or permission change**: use approved identity processes, grant only the permissions actually needed, set correct group and ACL ownership, and verify as the target account. Avoid scripts that embed default passwords or grant `sudo` automatically.",
      'Never copy broad `rm -rf` examples from a cheat sheet straight into production.',
    ],
    followUps: [
      'Which of these would you automate as a runbook first, and why?',
      'How do you get in when SSH itself is failing?',
    ],
    tags: ['troubleshooting', 'scenarios'],
  },
  {
    id: 'itv-mylnx-79',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key process management commands?',
    probing:
      'Whether you know the everyday process tools, graceful versus forced kill, and process hierarchy.',
    answer: [
      "When an application crashes, consumes too much CPU, or stops responding, you need to look at its processes. When you run `ps aux` on a production server, check the `%CPU` and `%MEM` columns for outliers, and look for any process that shouldn't be running at all.",
      'Try a plain `kill` before `kill -9`. A plain `kill` sends `SIGTERM`, which asks the process to shut down cleanly. `kill -9` sends `SIGKILL`, which ends it immediately with no chance to clean up.',
      '`pstree` shows parent-child relationships. Do not assume killing a parent process also ends its children — a child can catch the signal, keep running, or get re-parented to another process.',
      'For managed applications, use the service manager or orchestrator instead of killing processes directly, so shutdown and restart behavior stays consistent.',
    ],
    code: [
      {
        title: 'See what is running',
        language: 'bash',
        code: `# The holy trinity of process monitoring
ps aux                    # Snapshot of all processes
top                       # Real-time view (like Task Manager)
htop                      # Enhanced version (install it everywhere)`,
      },
      {
        title: 'Kill misbehaving processes',
        language: 'bash',
        code: `# Find the troublemaker first
ps aux | grep nginx

# Kill it gently
kill 1234

# Kill it with force (when gentle doesn't work)
kill -9 1234

# Signal all matching processes only after confirming the exact target
pkill -TERM -x nginx`,
      },
      {
        title: 'Process hierarchy',
        language: 'bash',
        code: `pstree                    # Visual process tree
pstree -p                 # Include process IDs`,
      },
    ],
    tags: ['processes', 'commands'],
  },
  {
    id: 'itv-mylnx-80',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Linux networking and firewall commands?',
    probing:
      'Whether you know the tools for interfaces, listening ports, reachability, DNS and host firewalls.',
    answer: [
      'Services depend on the network to reach each other. When networking breaks, everything built on top of it breaks too.',
      'I use `ip` for interfaces (the old `ifconfig` still works), `ss` (the modern, faster replacement for `netstat`) and `lsof -i` to see which process owns a port, `ping` and `traceroute` for reachability and path, `dig` and `nslookup` for DNS, and `ufw` or `iptables` for the host firewall.',
    ],
    code: [
      {
        title: 'Network interfaces',
        language: 'bash',
        code: `# Modern way to check network setup
ip addr show              # Show all network interfaces
ip link show              # Show network devices

# The old way (still works)
ifconfig                  # Shows interface configuration`,
      },
      {
        title: 'Port monitoring',
        language: 'bash',
        code: `# Who's using what port?
netstat -tulpn            # Show all listening ports with processes
ss -tulpn                 # Modern replacement (faster)

# Specific port investigation
lsof -i :80               # What's using port 80?
lsof -i :3306             # Check if MySQL is running`,
      },
      {
        title: 'Connectivity and DNS',
        language: 'bash',
        code: `# Is the server reachable?
ping google.com           # Basic connectivity test
ping -c 4 server.com      # Send only 4 packets

# Trace the network path
traceroute google.com     # Show every router hop

# DNS investigation
dig google.com            # Detailed DNS lookup
nslookup google.com       # Simple DNS check`,
      },
      {
        title: 'Firewall management',
        language: 'bash',
        code: `# Ubuntu/Debian firewall (UFW - Uncomplicated Firewall)
sudo ufw status           # Check firewall status
sudo ufw enable           # Turn on firewall
sudo ufw allow 22         # Allow SSH
sudo ufw allow 80/tcp     # Allow HTTP traffic
sudo ufw deny 8080        # Block specific port

# Traditional iptables (more complex but powerful)
sudo iptables -L          # List all rules
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT  # Allow HTTPS`,
      },
    ],
    tags: ['networking', 'commands', 'firewall'],
  },
  {
    id: 'itv-mylnx-81',
    level: 'basic',
    kind: 'open',
    prompt:
      'What are the key commands for filesystem navigation, file operations and viewing files?',
    probing:
      'Whether you are fluent with navigation and file handling and careful before deleting.',
    answer: [
      "You'll spend a lot of time navigating server filesystems, so knowing these commands well saves real time.",
      'Run `ls` first to confirm exactly what a delete command will affect, before running `rm`. `tail -f` follows a log in real time, which is a lifesaver for debugging.',
    ],
    code: [
      {
        title: 'Navigation',
        language: 'bash',
        code: `pwd                       # Where am I?
cd /var/log               # Go to logs directory
cd ..                     # Go up one level
cd ~                      # Go home
cd -                      # Go to previous directory`,
      },
      {
        title: 'File and directory operations',
        language: 'bash',
        code: `# Creating things
mkdir -p /path/to/deep/directory    # Create nested directories
touch config.yaml                    # Create empty file

# Copying and moving
cp app.py app.py.backup              # Backup before changes
cp -r /source/dir /destination/      # Copy entire directories
mv oldname.txt newname.txt           # Rename files

# Removing (be careful!)
rm filename                          # Delete file
rm -rf directory                     # Delete directory and contents (DANGEROUS!)`,
      },
      {
        title: 'File viewing',
        language: 'bash',
        code: `# Quick file inspection
cat config.yaml           # Show entire file
head -20 app.log          # First 20 lines
tail -50 error.log        # Last 50 lines
tail -f application.log   # Follow log in real-time (lifesaver for debugging)

# Paginated viewing
less large-file.txt       # Navigate large files`,
      },
    ],
    tags: ['files', 'commands'],
  },
  {
    id: 'itv-mylnx-82',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do you print the last 15 lines of a file, and view a huge log file that is continuously updated?',
    probing: 'Whether you know tail -n and tail -f, including on command output.',
    answer: [
      'The `tail` command prints the last part of a file: `tail -n <number_of_lines> <filename>`, for example `tail -n 15 /var/log/syslog`.',
      '"I\'d use `tail -f logfile.log` to stream the last lines in real time." If you want the last 15 lines of a command\'s output instead of a file, pipe it: `dmesg | tail -n 15`.',
    ],
    code: [
      {
        title: 'tail examples',
        language: 'bash',
        code: `tail -n 15 /var/log/syslog
tail -f filename.txt      # continuously monitor file updates (live view)
dmesg | tail -n 15        # last 15 lines of a command's output`,
      },
    ],
    tags: ['logs', 'tail'],
  },
  {
    id: 'itv-mylnx-83',
    level: 'basic',
    kind: 'open',
    prompt:
      'How do Linux permissions, ownership and user accounts work, and what are the key commands?',
    probing:
      'Whether you can read the rwx matrix, use symbolic and numeric chmod, manage ownership and accounts safely.',
    answer: [
      'Understanding permissions prevents security issues and deployment failures. Each file has three sets of `rwx` bits — owner, group and others — where r = read (4), w = write (2), x = execute (1).',
      "Check your distribution's account-management policy before creating or deleting users. `useradd` defaults vary between distributions, and removing a home directory can destroy data. At scale, prefer a central identity system over local accounts.",
      "The key account files are `/etc/passwd`, `/etc/shadow` and `/etc/group`. Password hashes live in `/etc/shadow`, which only privileged users can read. UID ranges for system versus regular users are distribution-configurable, so don't assume a universal `0–999` boundary.",
      'There are also three special permission bits (setuid, setgid and sticky), set as an extra digit before the normal three. Audit these bits carefully.',
    ],
    code: [
      {
        title: 'Permission matrix',
        language: 'text',
        code: `rwx rwx rwx
│   │   └── Others (everyone else)
│   └────── Group (file's group)
└────────── Owner (file creator)

r = read (4)    - Can view file content
w = write (2)   - Can modify file
x = execute (1) - Can run file as program`,
      },
      {
        title: 'chmod in practice',
        language: 'bash',
        code: `# Symbolic notation (readable)
chmod u+x script.sh       # Give owner execute permission
chmod g-w file.txt        # Remove group write permission
chmod o+r document.pdf    # Give others read permission
chmod a+x binary          # Give everyone execute permission

# Numeric notation (faster once you learn it)
chmod 755 script.sh       # rwxr-xr-x (common for scripts)
chmod 644 config.txt      # rw-r--r-- (common for config files)
chmod 600 private.key     # rw------- (private keys)
chmod 777 file.txt        # rwxrwxrwx (AVOID THIS - security risk!)`,
      },
      {
        title: 'Ownership management',
        language: 'bash',
        code: `# Change file ownership
sudo chown user:group file.txt      # Change both user and group
sudo chown jenkins config.yaml      # Change only owner
sudo chown :docker script.sh        # Change only group

# Recursive ownership changes
sudo chown -R nginx:nginx /var/www/html   # Change entire directory tree`,
      },
      {
        title: 'Users and groups',
        language: 'bash',
        code: `id username
groups username
sudo useradd --create-home --shell /bin/bash username
sudo passwd username
sudo usermod -aG application-team username
sudo userdel --remove username`,
      },
    ],
    tags: ['permissions', 'users', 'commands'],
  },
  {
    id: 'itv-mylnx-84',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key commands for monitoring disk usage and finding space hogs?',
    probing: 'Whether you know df, du and find size/age filters for disk investigations.',
    answer: [
      'Monitoring disk usage prevents most storage-related incidents. `df -h` shows human-readable usage and `df -i` checks inode usage — you can run out of inodes even with space left.',
      '`du` shows directory sizes, and `find` with `-size` and `-mtime` finds large files and old files that are potential cleanup candidates.',
    ],
    code: [
      {
        title: 'Disk space monitoring',
        language: 'bash',
        code: `# Check available space
df -h                     # Human-readable disk usage
df -i                     # Check inode usage (can run out even with space)

# Find what's eating your disk
du -h /var/log            # Directory size
du -sh *                  # Size of each item in current directory
du -h --max-depth=1 /     # Top-level directory sizes`,
      },
      {
        title: 'Finding space hogs',
        language: 'bash',
        code: `# Find large files
find / -size +100M -type f 2>/dev/null    # Files larger than 100MB
find /var/log -name "*.log" -size +50M    # Large log files

# Find old files (potential cleanup candidates)
find /tmp -type f -mtime +30              # Files older than 30 days`,
      },
    ],
    tags: ['disk', 'commands'],
  },
  {
    id: 'itv-mylnx-85',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What are the key commands for searching and filtering: find, grep, awk, sed, cut, sort and uniq?',
    probing: 'Whether you can combine the text-processing tools to answer log questions quickly.',
    answer: [
      "Being able to search and filter quickly saves real time when you're troubleshooting a production issue.",
      '`find` locates files by name, size, date and permissions (for example world-writable files, a security risk). `grep` searches text; `awk` extracts columns; `sed` edits streams or prints line ranges; `cut` pulls simple fields; and `sort | uniq -c | sort -nr` counts and ranks unique values.',
    ],
    code: [
      {
        title: 'File finding',
        language: 'bash',
        code: `# Find files by name
find /var/log -name "*.log"           # All log files
find /etc -name "*nginx*"             # Anything with nginx in name
find / -type f -name "config.yaml"    # Specific filename anywhere

# Find by size and date
find /var/log -size +100M             # Large log files
find /tmp -mtime +7                   # Files older than 7 days
find /etc -type f -perm 777           # World-writable files (security risk)`,
      },
      {
        title: 'grep',
        language: 'bash',
        code: `grep "ERROR" /var/log/app.log         # Find errors in logs
grep -r "database" /etc/              # Recursively search for "database"
grep -i "warning" *.log               # Case-insensitive search
grep -n "failed" app.log              # Show line numbers
grep -v "DEBUG" app.log               # Exclude debug messages

# Real-world log analysis
grep "500" /var/log/nginx/access.log | wc -l     # Count 500 errors
grep "$(date '+%Y-%m-%d')" /var/log/app.log       # Today's logs only`,
      },
      {
        title: 'awk, sed, cut, sort and uniq',
        language: 'bash',
        code: `# awk - column extraction magic
awk '{print $1}' /var/log/nginx/access.log            # Extract IP addresses
awk -F: '{print $1}' /etc/passwd                      # Extract usernames
awk '$9 == 404 {print $1}' /var/log/nginx/access.log  # IPs with 404 errors

# sed - stream editing
sed 's/old/new/g' config.txt          # Replace all occurrences
sed -n '10,20p' large-file.txt        # Print lines 10-20

# cut - simple column extraction
cut -d: -f1 /etc/passwd               # First field using : delimiter
cut -c1-10 filename                   # Characters 1-10 of each line

# sort and unique analysis
sort /var/log/ips.txt | uniq -c | sort -nr    # Count and sort unique IPs`,
      },
    ],
    tags: ['grep', 'awk', 'sed', 'commands'],
  },
  {
    id: 'itv-mylnx-86',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you process a log file with grep to extract IP addresses and count occurrences?',
    probing:
      'Whether you can build a grep | sort | uniq -c | sort -nr pipeline and explain each stage.',
    answer: [
      'You can combine `grep` with `awk`, `sort`, and `uniq` to pull IP addresses out of log files and count how often each one appears.',
      '1. **Extract the IP addresses.** Use `grep` with a regular expression: `-E` turns on extended regex, `-o` prints only the matching text, not the whole line, and the pattern `([0-9]{1,3}\\.){3}[0-9]{1,3}` matches an IPv4 address (like `10.0.0.5`).\n2. **Count how often each one appears.** Pipe the output through `sort` (identical lines sit next to each other), `uniq -c` (counts each unique IP) and `sort -nr` (highest count first).\n3. **Save the results to a file.** Redirect the output to a file for later analysis.\n4. **If the IP is always the first field on the line,** simplify the extraction with `awk` instead.',
      'This gives you a list of IP addresses with their occurrence counts, highest first.',
    ],
    code: [
      {
        title: 'Extract, count and save IPs',
        language: 'bash',
        code: `grep -oE '([0-9]{1,3}\\.){3}[0-9]{1,3}' logfile.log
grep -oE '([0-9]{1,3}\\.){3}[0-9]{1,3}' logfile.log | sort | uniq -c | sort -nr
grep -oE '([0-9]{1,3}\\.){3}[0-9]{1,3}' logfile.log | sort | uniq -c | sort -nr > ip_counts.txt`,
      },
      {
        title: 'When the IP is the first field',
        language: 'bash',
        code: `awk '{print $1}' logfile.log | sort | uniq -c | sort -nr`,
      },
    ],
    tags: ['grep', 'logs', 'awk'],
  },
  {
    id: 'itv-mylnx-87',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key package management commands for APT and YUM/DNF?',
    probing: 'Whether you know install, remove, purge and search on both Debian and RHEL families.',
    answer: [
      'APT is used on Ubuntu/Debian; YUM on older RHEL/CentOS and DNF on newer Fedora/RHEL systems.',
      'Run `apt update` before `apt install` so you install from the current package list rather than a stale cached one. `apt purge` removes a package and its configs, and `apt autoremove` cleans up orphaned dependencies.',
    ],
    code: [
      {
        title: 'APT (Ubuntu/Debian)',
        language: 'bash',
        code: `# Update package database first (always!)
sudo apt update                       # Refresh package lists
sudo apt upgrade                      # Upgrade installed packages

# Install software
sudo apt install nginx                # Install web server
sudo apt install htop git curl        # Multiple packages at once

# Remove software
sudo apt remove nginx                 # Remove package
sudo apt purge nginx                  # Remove package and configs
sudo apt autoremove                   # Clean up orphaned dependencies

# Search for packages
apt search docker                     # Find docker-related packages
apt list --installed | grep python    # List installed Python packages`,
      },
      {
        title: 'YUM/DNF (Red Hat/CentOS/Fedora)',
        language: 'bash',
        code: `# YUM (older RHEL/CentOS systems)
sudo yum update                       # Update all packages
sudo yum install docker               # Install Docker
sudo yum remove docker                # Remove Docker

# DNF (newer Fedora/RHEL systems)
sudo dnf update                       # Update packages
sudo dnf install podman               # Install container runtime
sudo dnf search kubernetes            # Search for packages`,
      },
    ],
    tags: ['packages', 'commands'],
  },
  {
    id: 'itv-mylnx-88',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you inspect system information and configure the shell environment (profiles, aliases, environment variables)?',
    probing:
      'Whether you know system-info commands, profile load order, and why secrets must not live in environment files.',
    answer: [
      'Profile files load in order: `/etc/profile` (system-wide login profile), `~/.bash_profile` (user login profile), and `~/.bashrc` (user interactive shell config). Aliases go in `~/.bashrc` to make them permanent, then `source ~/.bashrc` to reload trusted configuration.',
      "Environment variables pass down to child processes, and they can leak through debugging output, crash reports, CI logs, or process inspection. Don't store long-lived secrets in shell profiles or committed `.env` files. Use an approved secret manager and short-lived credentials instead.",
    ],
    code: [
      {
        title: 'System information',
        language: 'bash',
        code: `# Know your system
uname -a                              # Complete system info
lscpu                                 # CPU information
free -h                               # Memory usage
lsblk                                 # Block devices (disks)
df -h                                 # Disk usage

# OS and version info
cat /etc/os-release                   # OS version details
hostnamectl                           # Hostname and system info`,
      },
      {
        title: 'Aliases',
        language: 'bash',
        code: `alias ll='ls -la'                     # Long listing
alias la='ls -la'                     # All files with details
alias grep='grep --color=auto'        # Colored grep output
alias k='kubectl'                     # Kubernetes shortcut

# Make aliases permanent
echo "alias ll='ls -la'" >> ~/.bashrc
source ~/.bashrc                      # Reload trusted configuration`,
      },
      {
        title: 'Environment variables',
        language: 'bash',
        code: `env                                   # All environment variables
echo $PATH                            # Show PATH variable
echo $HOME                            # Home directory

# Non-sensitive runtime configuration
export APP_ENV="development"`,
      },
    ],
    tags: ['shell', 'environment', 'commands'],
  },
  {
    id: 'itv-mylnx-89',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the Vim essentials you use when editing config on a server?',
    probing:
      'Whether you can safely edit, save and quit in Vim and validate config before reloading.',
    answer: [
      'The essentials are switching between Normal and Insert mode, writing and quitting, searching, and jumping around the file.',
      "Validate a service's configuration before reloading it. Keep a recoverable copy, or better, manage the configuration in version control.",
    ],
    code: [
      {
        title: 'Vim essentials',
        language: 'text',
        code: `vim file.conf    open a file
i                enter Insert mode
Esc              return to Normal mode
:w               write changes
:q               quit
:wq              write and quit
:q!              quit and discard unsaved changes
/pattern         search forward
n / N            next / previous match
:set number      show line numbers
gg / G           first / last line
0 / $            start / end of line`,
      },
    ],
    tags: ['vim', 'commands'],
  },
  {
    id: 'itv-mylnx-90',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do pipes and redirection work in the shell?',
    probing:
      'Whether you know redirection operators, that the shell handles them before the command runs, and the sudo redirection trap.',
    answer: [
      "Redirection is processed by the shell before the command starts. `>` truncates an existing file, and `sudo command > /root/file` does not make the shell's redirection privileged.",
      'Quote variables and use `set -o pipefail` in scripts when an earlier pipeline command failing must fail the pipeline.',
    ],
    code: [
      {
        title: 'Redirection and pipelines',
        language: 'bash',
        code: `command >output.txt          # Replace stdout file
command >>output.txt         # Append stdout
command 2>error.log          # Replace stderr file
command >all.log 2>&1        # Send stdout and stderr to one file
command <input.txt           # Read stdin from a file
producer | consumer          # Producer stdout becomes consumer stdin

ps aux | sort -k4 -rn | head -10
du -ah /var/log | sort -rh | head -10
tail -F /var/log/app.log | grep --line-buffered ERROR`,
      },
    ],
    tags: ['shell', 'redirection'],
  },
  {
    id: 'itv-mylnx-91',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key system monitoring commands, and how do you interpret swap usage?',
    probing:
      'Whether you know the load, memory and I/O monitoring tools and do not equate swap use with a leak.',
    answer: [
      '`uptime` shows load average and uptime, `w` shows who is logged in and what they are doing, `top`/`htop` give a real-time view, `free -h` and `/proc/meminfo` show memory, `vmstat`, `iostat` and `sar` show virtual memory, disk I/O and system activity over intervals.',
      "High swap usage alone doesn't prove there's memory pressure or a leak. Check swap-in/swap-out activity, available memory, OOM events, page-fault behavior, and per-process growth before deciding whether to tune the workload or add RAM.",
    ],
    code: [
      {
        title: 'Load, memory and I/O',
        language: 'bash',
        code: `# System overview
uptime                                # Load average and uptime
w                                     # Who's logged in and doing what
top                                   # Real-time process monitoring
htop                                  # Enhanced process viewer

# Memory analysis
free -h                               # Memory usage summary
cat /proc/meminfo                     # Detailed memory info
vmstat 1 5                            # Virtual memory stats (1 sec intervals, 5 times)

# I/O performance
iostat 1 5                            # Disk I/O statistics
sar 1 5                               # System activity report`,
      },
      {
        title: 'Swap status',
        language: 'bash',
        code: `swapon --show                         # Active swap partitions
cat /proc/swaps                       # Swap usage details
free -h                               # Memory and swap summary`,
      },
    ],
    tags: ['monitoring', 'memory', 'commands'],
  },
  {
    id: 'itv-mylnx-92',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you manage services with systemd?',
    probing:
      'Whether you know start/stop/restart/reload, enable/disable, listing failed units and reading unit logs.',
    answer: [
      'Modern Linux uses `systemd` for service management. `restart` stops then starts a service, while `reload` re-reads configuration without a restart where the service supports it. `enable` makes a service start automatically at boot; `disable` stops that.',
      'For troubleshooting I list failed units with `systemctl list-units --failed` and read service logs with `journalctl -u <service>`. The legacy `service` command and `/etc/init.d` scripts still work on many systems.',
    ],
    code: [
      {
        title: 'Service control',
        language: 'bash',
        code: `# Basic service operations
sudo systemctl start nginx            # Start web server
sudo systemctl stop nginx             # Stop web server
sudo systemctl restart nginx          # Restart (stop then start)
sudo systemctl reload nginx           # Reload config without restart

# Service status and health
systemctl status nginx                # Detailed service status
systemctl is-active nginx             # Quick active check
systemctl is-enabled nginx            # Check if starts at boot

# Enable/disable services
sudo systemctl enable nginx           # Start automatically at boot
sudo systemctl disable nginx          # Don't start at boot`,
      },
      {
        title: 'Service discovery and logs',
        language: 'bash',
        code: `# List services
systemctl list-units --type=service   # All services
systemctl list-units --failed         # Only failed services
systemctl list-unit-files --type=service | grep enabled  # Boot-enabled services

# Log investigation
journalctl -u nginx                       # Service-specific logs
journalctl -u nginx --since "1 hour ago"  # Recent logs
journalctl -f -u nginx                    # Follow logs in real-time`,
      },
      {
        title: 'Legacy service management',
        language: 'bash',
        code: `sudo service nginx start              # Start service
sudo service nginx status             # Check status
sudo /etc/init.d/nginx restart        # Direct init script`,
      },
    ],
    tags: ['systemd', 'services'],
  },
  {
    id: 'itv-mylnx-93',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Which Linux commands do you use every day, and which for emergency debugging?',
    probing: 'Whether you have a ready set of daily-health and first-response commands.',
    answer: [
      'Daily operations cover process monitoring, network debugging, following logs and checking system health. Emergency debugging focuses on the top CPU and memory users, available memory and the largest directories and log files.',
      'The daily and emergency command sets are in the code samples below.',
    ],
    code: [
      {
        title: 'Daily operations',
        language: 'bash',
        code: `# Process monitoring
ps aux | grep python                  # Find Python processes
top -p $(pgrep nginx)                 # Monitor specific processes
htop                                  # Interactive process manager

# Network debugging
ss -tulpn | grep :80                  # Check web server port
ping -c 3 database-server             # Test connectivity
curl -I https://api.example.com       # Check API health

# File operations
tail -f /var/log/app.log              # Follow application logs
find /var/log -name "*.log" -mtime -1 # Today's log files
grep -r "ERROR" /var/log/ | tail -10  # Recent errors

# System health
df -h                                 # Disk space check
free -h                               # Memory usage
systemctl status docker               # Service status`,
      },
      {
        title: 'Emergency debugging',
        language: 'bash',
        code: `# High CPU investigation
ps aux --sort=-%cpu | head -10        # Top CPU users

# Memory issues
ps aux --sort=-%mem | head -10        # Top memory users
cat /proc/meminfo | grep Available    # Available memory

# Disk space emergency
du -sh /* | sort -hr | head -10       # Largest directories
find /var/log -name "*.log" -size +100M  # Large log files`,
      },
    ],
    tags: ['commands', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-94',
    level: 'basic',
    kind: 'open',
    prompt: 'What Linux best practices help you avoid production mistakes?',
    probing:
      'Whether you back up, dry-run destructive commands, version configuration and watch logs during changes.',
    answer: [
      '1. **Always backup before making changes**, for example `cp config.yaml config.yaml.backup`.\n2. **Test commands safely first.** Run the `find` expression without `-delete` to see what will be deleted, then run it with `-delete`.\n3. **Manage configuration through reviewed version control or configuration management.** Avoid casually running `git init` across `/etc` — it can capture secrets and misleading generated state. Tools such as Ansible, or a carefully configured `etckeeper` setup, are safer patterns.\n4. **Monitor logs in real-time during deployments** — one terminal for the deployment, another running `tail -f` on the log.\n5. **Learn keyboard shortcuts.**',
      '- `Ctrl+C`: cancel current command\n- `Ctrl+Z`: suspend current command\n- `Ctrl+R`: search command history\n- `Tab`: auto-complete commands and paths',
    ],
    code: [
      {
        title: 'Dry run before delete',
        language: 'bash',
        code: `# Test what files will be deleted
find /tmp -name "*.tmp" -type f
# Then actually delete them
find /tmp -name "*.tmp" -type f -delete`,
      },
      {
        title: 'Watch logs during a deployment',
        language: 'bash',
        code: `# One terminal for deployment
sudo systemctl restart myapp
# Another terminal for monitoring
tail -f /var/log/myapp.log`,
      },
    ],
    tags: ['best practices'],
  },
  {
    id: 'itv-mylnx-95',
    level: 'advanced',
    kind: 'open',
    prompt:
      'You have hosted an application on a Linux server. How would you migrate it to a serverless architecture in Azure?',
    probing:
      'Whether you can plan a refactor to Functions and managed services with CI/CD, testing and monitoring, not just a lift-and-shift.',
    answer: [
      "To migrate an application from a Linux server to a serverless setup in Azure, I'd follow these steps:",
      '1. **Assess the application.** Understand its architecture, dependencies, and components to see which parts can move to serverless.\n2. **Choose the Azure services.** For example, `Azure Functions` for compute, `Azure Logic Apps` for workflows, and `Azure Blob Storage` for static content.\n3. **Refactor the application.** Change the code to fit the serverless model, breaking it into smaller functions where needed.\n4. **Set up the Azure environment.** Create the Function Apps, Storage Accounts, and any other resources you need.\n5. **Deploy the application.** Use Azure DevOps or another CI/CD tool to deploy the refactored app.\n6. **Test and optimize.** Test it thoroughly in the serverless environment and tune it for performance and cost.\n7. **Monitor and maintain.** Set up `Azure Monitor` and `Application Insights` so you can see the application is running smoothly.',
    ],
    followUps: [
      'Which parts of the application would you not move to Functions, and why?',
      'How would you handle state and long-running jobs in a serverless design?',
    ],
    tags: ['azure', 'serverless', 'migration'],
  },
]
