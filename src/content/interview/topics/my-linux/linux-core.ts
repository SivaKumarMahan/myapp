import type { InterviewQuestion } from '../../../types'

/** Linux processes, users, SSH, permissions, text search, logs and cron. */
export const myLinuxCoreQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mylnx-1',
    level: 'basic',
    kind: 'open',
    prompt: 'Do you have hands-on Linux experience? Which platform?',
    probing:
      'Whether you can back up a claim of Linux experience with concrete platforms, tasks and a real incident.',
    answer: [
      'I answer honestly, naming the platforms, how long I worked with them, and what I actually did. For example: "I have administered Ubuntu and RHEL/Amazon Linux application servers. My work included systemd services, user and sudo and SSH setup, package patching, filesystems and LVM, network and DNS and firewall checks, cron jobs, logs, performance troubleshooting, hardening, backups, and CI/CD deployment."',
      'Then I give a real example. Once a disk filled up because logs were not being rotated. I found the filesystem and the open files, safely freed up space, checked that the application could still write, and then added log rotation plus alerts at 70% and 85% full. This shows I actually investigated the problem, not just that I can name a few distributions.',
      'I also make clear which tasks I owned myself versus which were handled by a managed service or a separate cloud team.',
    ],
    tags: ['experience', 'linux'],
  },
  {
    id: 'itv-mylnx-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What are common Linux commands you use?',
    probing:
      'Whether you know the everyday toolset by purpose and use it carefully rather than reciting names.',
    answer: [
      "I group commands by what they're for. For files: `ls`, `find`, `cp`, `mv`, `stat`. For text and logs: `less`, `grep`, `awk`, `sed`, `tail`. For processes: `ps`, `top`, `pidstat`, `kill`. For resource checks: `free`, `vmstat`, `df`, `du`, `iostat`. For network: `ip`, `ss`, `dig`, `curl`, `nc`. For services: `systemctl`, `journalctl`. For permissions: `chmod`, `chown`, `getfacl`. And for transferring or archiving data: `rsync`, `scp`, `tar`.",
      'I use them carefully. I quote file paths, gather read-only evidence before changing anything, use `--` before an untrusted filename, look at what a recursive or delete command will touch before running it, and keep a record of commands and their output during an incident. I pick a command to test one specific idea. Running a pile of commands without understanding what they show is not troubleshooting.',
    ],
    tags: ['commands', 'linux'],
  },
  {
    id: 'itv-mylnx-3',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you check running processes?',
    probing:
      'Whether you can inspect processes with the right snapshot, live and trend tools and interpret state before acting.',
    answer: [
      'For a snapshot, I run `ps -eo pid,ppid,user,stat,lstart,etime,%cpu,%mem,cmd --sort=-%cpu`. For a live view, `top` or `htop`. For trends over time, `pidstat -p <pid> 1`. `pgrep -af name` finds matching command lines, and for a systemd service I use `systemctl status` and `journalctl -u`.',
      "I look at the owner, parent process, state (running, sleeping, uninterruptible, or zombie), how long it has run, CPU and memory use, threads, and open files or ports. A process showing up in `ps` is not necessarily healthy, so I also check the application's own health endpoint or metrics.",
      "I don't kill anything until I know who owns it and what it's for, and I capture logs or a memory dump first if that evidence would otherwise be lost.",
    ],
    tags: ['processes', 'ps'],
  },
  {
    id: 'itv-mylnx-4',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you kill a process in one command?',
    probing:
      'Whether you default to graceful signals and service managers, and understand when SIGKILL is justified.',
    answer: [
      'Normally I use the service manager or a plain SIGTERM: `systemctl stop app` or `kill -TERM <pid>`, then wait and check it actually stopped. SIGTERM gives the process a chance to clean up, drain connections, and flush data.',
      "If it hasn't exited after a reasonable, approved wait, I check its state first — a process stuck in uninterruptible sleep (D state) can't be killed until the kernel operation it's waiting on finishes — and capture evidence, then use `kill -KILL` only as a last resort.",
      "I avoid broad `pkill` unless I've confirmed the pattern with `pgrep -af` first. After the process is gone, I check whether its parent or supervisor — systemd or Kubernetes, for example — will restart it, check the ports and data consistency, and confirm the application is actually healthy. Killing a process is a mitigation, not a fix for the underlying cause.",
      'Try a plain `kill` first so the process can clean up after itself. Only use `-9` if it ignores that and refuses to stop. For many daemons, `kill -HUP <PID>` reloads configuration instead of stopping them.',
    ],
    code: [
      {
        title: 'Finding and killing a process',
        language: 'bash',
        code: `ps aux | grep <name>     # find PID
kill <PID>               # ask it to stop gracefully
kill -9 <PID>            # force-kill, last resort
pkill -f <pattern>       # kill by command pattern
kill -HUP <PID>          # reload config for many daemons`,
      },
    ],
    tags: ['processes', 'signals'],
  },
  {
    id: 'itv-mylnx-5',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you check disk usage?',
    probing:
      'Whether you check both space and inodes, drill down on the right filesystem and know why df and du can differ.',
    answer: [
      "`df -hT` shows how full each filesystem is; `df -i` shows inode usage instead of space. Once I know which filesystem is affected, I dig in with `du -xhd1 /path | sort -h` and keep drilling down from there. `find` can list the biggest files, and `lsof +L1` finds files that were deleted but are still open, which `du` won't show.",
      'I compare what `df` and `du` report, and check mount points, reserved blocks, sparse files, and container or log paths.',
      "I never delete files I don't recognize, or system or database files. Instead I stop whatever is generating the growth, rotate or archive the data that's safe to remove, or add storage, then confirm the service can still write, and add alerts based on retention and capacity forecasts.",
    ],
    tags: ['disk', 'df/du'],
  },
  {
    id: 'itv-mylnx-6',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you find free memory?',
    probing:
      'Whether you read the available column rather than free, and distinguish normal cache use from real memory pressure.',
    answer: [
      "`free -h` — but I look at the `available` column, not `free`, because Linux uses spare RAM for cache that it can reclaim when needed. `vmstat 1` shows swap activity (`si`/`so`) and how many processes are running or blocked. `ps --sort=-%mem`, `smem`, `pmap`, and `pidstat -r` help identify what's using the memory.",
      "I also check the kernel's out-of-memory logs: `journalctl -k | grep -i oom`.",
      'I look at this against the actual workload and its trend over time. High used memory or cache alone is normal. Sustained swapping, allocation failures, OOM kills, or rising latency are the real signs of pressure.',
      'I fix the actual cause — a leak, a cache setting, a config change — or right-size and scale the service based on evidence. Restarting is only a temporary fix, and I preserve diagnostics before doing it.',
    ],
    tags: ['memory', 'free'],
  },
  {
    id: 'itv-mylnx-7',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you archive or compress a directory?',
    probing:
      'Whether you can use tar correctly and treat an archive as a backup that must be verified and restorable.',
    answer: [
      "`tar` bundles files and keeps their metadata; gzip compresses the result. I use `-C` so the archive doesn't store unwanted absolute paths, look inside the archive before extracting it, extract anything untrusted into its own isolated directory, verify the checksum, and do a test restore.",
      "For a live database or data that's actively changing, I use an application-consistent backup instead of tarring files while they're being written to. Encryption and where backups are kept follow whatever the data policy requires.",
    ],
    code: [
      {
        title: 'Create, inspect, restore and checksum an archive',
        language: 'bash',
        code: `tar -C /path/to -czf backup-$(date +%F).tar.gz directory
tar -tzf backup-2026-07-19.tar.gz | head
mkdir restore && tar -C restore -xzf backup-2026-07-19.tar.gz
sha256sum backup-2026-07-19.tar.gz > backup.sha256`,
      },
    ],
    tags: ['tar', 'backup'],
  },
  {
    id: 'itv-mylnx-8',
    level: 'basic',
    kind: 'open',
    prompt: 'Do you need a password or key for SSH?',
    probing:
      'Whether you understand SSH authentication options, key-based access and how keys are protected and revoked.',
    answer: [
      'SSH supports passwords, public keys, certificates, multi-factor auth through PAM, and federated or session-based systems. In production and cloud environments, password login and direct root login are usually disabled, and access goes through keys, certificates, or a session manager like SSM instead.',
      'The client proves it holds the private key; the server just stores the matching public key in `authorized_keys` with the right ownership and permissions.',
      'The private key needs protecting — a passphrase, an agent, or hardware storage where possible — and it should never be copied broadly onto servers or into CI systems. Each person should have their own key. Access is logged, and keys get rotated or revoked.',
      'If a key is lost, I remove its public key, issue a new pair through a process that verifies identity, test the new access before closing the recovery session, and treat the old private key as compromised if it might still exist somewhere.',
    ],
    tags: ['ssh', 'security'],
  },
  {
    id: 'itv-mylnx-9',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you list all SSH users?',
    probing:
      'Whether you know SSH access is assembled from accounts, sshd rules, PAM, sudo and keys, and can audit it safely.',
    answer: [
      'There\'s no single "list of SSH users" to query. I build the picture from accounts with an interactive shell (`getent passwd`, excluding ones set to `nologin` or `false`), the `AllowUsers`/`AllowGroups`/`Deny*` rules, PAM and directory groups, sudo rules, and authorized keys or SSH certificates.',
      "To see who's actually using SSH, I check the auth logs and current sessions with `who`, `w`, `last`, and `journalctl -u sshd`.",
      'I never print private or sensitive key material. What comes out of a review is: the user, who owns the account, why it exists, how it authenticates, its privilege level, when it was last used, and when it expires.',
      'Stale accounts or keys get disabled through an approved process, and I monitor for new ones. Service accounts should use a non-interactive shell unless they genuinely need SSH.',
    ],
    tags: ['ssh', 'users'],
  },
  {
    id: 'itv-mylnx-10',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A user cannot log in. How will you troubleshoot?',
    probing:
      'Whether you split network from authentication and work through sshd, account state and file permissions methodically.',
    answer: [
      "I split the problem into network and authentication. On the client side: DNS, IP reachability, whether the port is open, and `ssh -vvv` for detail. On the server, using console or another access path: is sshd running and listening, is its config valid (`sshd -t`), what does the firewall or SELinux say, and what's the exact reason in the auth log.",
      "Then I check the account itself: `getent passwd`, whether it's locked or expired (`passwd -S`, `chage -l`), its shell and home directory, the Allow/Deny and PAM rules, group membership, and whether the key actually matches. For SSH, the home directory usually can't be writable by others, `.ssh` needs mode 700, `authorized_keys` needs mode 600 with the right owner, and SELinux context may need restoring.",
      'I make the smallest fix that solves the problem, test that the user can now log in and that unauthorized access is still denied, and never loosen security broadly to work around this. I record the actual root cause — an expired account, a wrong key, a permission or config issue — and follow up with an expiry alert or better onboarding automation.',
    ],
    tags: ['ssh', 'troubleshooting', 'users'],
  },
  {
    id: 'itv-mylnx-11',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A user was added to sudoers, but sudo still does not work. What could be wrong?',
    probing:
      'Whether you know how sudoers rules, includes, groups and sessions interact, and edit them safely with visudo.',
    answer: [
      "I capture the exact error `sudo` gives, then run `id user` and `sudo -l -U user`, and check `/etc/sudoers` and any included files, their order, group membership and whether the session needs a refresh, hostname or command restrictions, `secure_path`, and the account's PAM state. I only validate syntax with `visudo -c`, and only edit with `visudo` or `visudo -f`.",
      'I give the narrowest set of commands needed rather than `ALL=(ALL) ALL`, prefer a group-based rule managed through configuration management, and then test both an allowed command and one that should stay denied.',
      "I check audit logs to confirm the access is actually being used. Note that `NOPASSWD` only skips the password prompt — it doesn't grant authorization by itself, so adding it is not a general fix for sudo problems.",
    ],
    tags: ['sudo', 'users', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-12',
    level: 'intermediate',
    kind: 'scenario',
    prompt: "A user's home directory is missing. How will you restore it?",
    probing:
      'Whether you confirm the cause before recreating, and restore with correct ownership, modes, ACLs and SELinux context.',
    answer: [
      "I first confirm the account's home path with `getent passwd user`, check whether the filesystem or mount is actually there, and rule out a network home that's just temporarily unavailable versus one that was actually deleted. If I'm about to restore data, I stop the user's processes first so nothing is writing to it.",
      'To recreate it: `install -d -m 700 -o user -g group /home/user`, copy `/etc/skel` only for the default files, restore from backup while preserving ownership, ACLs, and extended attributes, and fix the SELinux context with `restorecon` if needed.',
      "I avoid running a recursive chown across mounted or shared data without reviewing the scope first. I check that login, shell, SSH, and application files work, compare the restore against the original timing and content, and look into how the directory was deleted. Then I put backup, tighter access, and lifecycle automation in place so it doesn't happen again.",
    ],
    tags: ['users', 'backup', 'permissions'],
  },
  {
    id: 'itv-mylnx-13',
    level: 'basic',
    kind: 'open',
    prompt: 'What does `chmod 755` mean?',
    probing:
      'Whether you can decode octal permissions and know what read, write and execute mean on files versus directories.',
    answer: [
      'The three octal digits are for owner, group, and others: read is 4, write is 2, execute is 1. `755` means the owner gets read, write, execute; the group and everyone else get read and execute. On a directory, read lets you list names, write lets you create or delete entries, and execute lets you enter or access entries. On a regular file, execute just means it can be run.',
      "I don't use 755 for everything — config files and secrets need tighter permissions, and shared directories often need setgid or ACLs instead. Permissions also depend on the parent directories, ACLs, mount options, and SELinux or AppArmor.",
    ],
    code: [
      {
        title: 'Set and verify mode',
        language: 'bash',
        code: `chmod 755 /opt/app/bin/start
stat -c '%A %a %U:%G %n' /opt/app/bin/start`,
      },
    ],
    tags: ['permissions', 'chmod'],
  },
  {
    id: 'itv-mylnx-14',
    level: 'basic',
    kind: 'open',
    prompt: 'What is `chown`?',
    probing:
      'Whether you understand ownership changes and the blast radius of a careless recursive chown.',
    answer: [
      '`chown user:group path` changes both owner and group; `chgrp` changes only the group. Ownership is what standard Linux permission checks and service access are based on.',
      'Before a recursive change, I preview it with `find` first, confirm the mount boundaries and any symlinks, and check what the application actually needs — a wrong `chown -R` on `/`, a database, or a whole system tree can break things or expose data. Where supported I use `chown -R --from=old:group new:group /explicit/path`, or a targeted `find -xdev` instead.',
      "Afterward I verify with `stat` or `getfacl`, confirm the service still runs and can read and write as expected, and check the SELinux context separately since ownership doesn't fix that. I put the change into package or configuration management so it stays in place.",
    ],
    tags: ['permissions', 'chown'],
  },
  {
    id: 'itv-mylnx-15',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A script is executable by one user but not another. How do you resolve this?',
    probing:
      'Whether you check path traversal, ACLs, interpreter, noexec mounts and MAC policy instead of reaching for 777.',
    answer: [
      'I run the script as the failing user and see whether I get "Permission denied" or an interpreter-not-found error — that tells me a lot. Then I check `namei -l /path/script` (execute or traverse permission is needed on every parent directory), `ls -l` or `getfacl`, `id`, whether the shebang\'s interpreter is itself executable, line endings, whether the mount has `noexec`, and SELinux/AppArmor/audit logs.',
      "Running `bash script` directly can help tell whether it's the execute bit or `noexec` versus a problem in the script itself, but it's not a real fix. I grant access through the right group, ACL, or ownership and the minimum directory traversal needed — never world-writable or 777. For SELinux, I restore the correct label or policy rather than turning SELinux off.",
      "Sometimes the user needs a new session for a group change to take effect. I confirm the intended user can now run it and that anyone unauthorized still can't, then put the permissions into configuration management.",
    ],
    tags: ['permissions', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you set default file and directory permissions?',
    probing:
      'Whether you understand umask arithmetic and use setgid plus default ACLs for shared directories.',
    answer: [
      "By default, new files start at 666 and directories at 777, minus the umask. A umask of `022` gives 644 for files and 755 for directories; `027` gives 640 and 750. I set this in the shell profile or, for a service, in systemd's `UMask=` — though the application itself may set an explicit mode regardless.",
      'For a shared project directory, I use setgid plus a default ACL.',
      "I test by actually creating a file or directory as the service user. Umask doesn't change files that already exist, and ACLs can change the effective permission on top of it. I avoid defaults that are more open than necessary.",
    ],
    code: [
      {
        title: 'Shared directory with setgid and default ACL',
        language: 'bash',
        code: `chmod 2770 /srv/team
setfacl -m g:team:rwx,d:g:team:rwx,d:o::--- /srv/team
getfacl /srv/team`,
      },
    ],
    tags: ['permissions', 'umask', 'acl'],
  },
  {
    id: 'itv-mylnx-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are sticky bit, setuid, and setgid?',
    probing:
      'Whether you know the special permission bits, where they are legitimately used and why they are a security audit item.',
    answer: [
      "The sticky bit (`+t`) is used on shared directories like `/tmp`, which typically has mode `1777`. It means only the file's owner, the directory's owner, or a privileged user can delete or rename a file there. Setgid on a directory (`2xxx`) makes new files inside inherit the directory's group; setgid on an executable makes it run with the file's group instead of the caller's.",
      "Setuid on an executable (`4xxx`) makes it run as the file's owner — often root. Linux generally ignores setuid on shell scripts.",
      "These bits matter for security. I list them with `find / -xdev -perm /6000 -type f`, check what package they belong to and why they're there, and remove any that shouldn't be there through an approved change. I'd rather use `sudo`, Linux capabilities, or a proper service design than a custom setuid program, and I test and audit whatever I change.",
      "- **setuid** (`4000`): an executable runs with the file owner's identity, not the identity of whoever ran it.\n- **setgid** (`2000`): an executable runs with the file's group identity. On a directory, new files inherit that directory's group.\n- **sticky bit** (`1000`): on a shared directory, only a file's owner or a privileged user can delete or rename it.",
      'Audit these bits carefully. Executables with setuid or setgid set can be used to escalate privileges if misconfigured.',
    ],
    tags: ['permissions', 'security'],
  },
  {
    id: 'itv-mylnx-18',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the purpose of `grep`?',
    probing:
      'Whether you know the useful grep flags and treat a match as a clue to correlate, not the root cause.',
    answer: [
      '`grep` picks out lines that match a pattern. Useful flags: `-i` for case-insensitive, `-n` for line numbers, `-r` for recursive, `-E` for extended regex, `-F` for a literal string, `-C` for surrounding context, `-v` to invert the match.',
      'I narrow the search to a specific time range or set of files, and use a literal string match when the pattern comes from user input rather than a real regex. A match is just a clue, not the root cause — I compare its timestamp and details against other service and system metrics.',
      "I'm careful not to expose secrets when sharing output. For structured logs, I'd rather use `jq` or a proper log query tool than a fragile regex.",
    ],
    code: [
      {
        title: 'Search logs with context, including rotated gzip files',
        language: 'bash',
        code: `grep -nC 3 -E 'ERROR|FATAL' /var/log/app.log
zgrep -h 'request_id=abc123' /var/log/app.log*.gz`,
      },
    ],
    tags: ['grep', 'logs'],
  },
  {
    id: 'itv-mylnx-19',
    level: 'basic',
    kind: 'open',
    prompt: 'Which `grep` flag shows lines not containing a keyword?',
    probing: 'Whether you know -v and grep exit codes, which matter inside scripts using set -e.',
    answer: [
      '`-v` inverts the match.',
      "`-F` treats the keyword as a literal string; `-E` lets you use alternation and other regex features. I quote patterns carefully, and I remember `grep`'s exit code matters: 0 means it found a match, 1 means it found nothing, and anything higher means an error — which matters if a script uses `set -e`.",
      'For binary, compressed, or rotated logs, I pick the right tool — `grep -a`, `zgrep`, or a proper log query — rather than forcing it. I keep the original log file intact rather than overwriting it just to get a filtered view.',
    ],
    code: [
      {
        title: 'Inverted matches',
        language: 'bash',
        code: `grep -vF 'health-check' access.log
grep -Ev 'DEBUG|TRACE' app.log`,
      },
    ],
    tags: ['grep'],
  },
  {
    id: 'itv-mylnx-20',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you find all files modified in the last 10 minutes?',
    probing:
      'Whether you know find time filters and correlate recent changes with incidents before deleting anything.',
    answer: [
      'I use `find` with the `-mmin` filter.',
      '`-10` means less than ten minutes ago, while `+10` means more than ten minutes ago. I search a specific path rather than `/` first, to keep it fast and avoid permission errors everywhere.',
      "If this is part of an incident, I sort the results and compare the modification times against when the deployment or failure happened. I don't run `-delete` right away — I look at the matches, who owns them, and what they're for first.",
    ],
    code: [
      {
        title: 'Files modified in the last 10 minutes',
        language: 'bash',
        code: `sudo find /var/log -type f -mmin -10 -printf '%TY-%Tm-%Td %TH:%TM %s %p\\n'`,
      },
    ],
    tags: ['find'],
  },
  {
    id: 'itv-mylnx-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you find large unused files across multiple partitions?',
    probing:
      'Whether you scope find per filesystem and confirm a file is really unused before archiving or deleting it.',
    answer: [
      'I first list the mounted filesystems with `df -hT`, then search each relevant one separately.',
      "This finds files bigger than 1 GB that haven't been touched in over 30 days. Modification time alone doesn't prove a file is unused, so I also check access patterns, whether anything has it open with `lsof`, who owns it, retention rules, and who's responsible for it.",
      'I archive or move a small, approved batch first, confirm the service is fine, and only then delete anything. If this keeps happening, I set up retention or log rotation instead of doing manual cleanup over and over.',
    ],
    code: [
      {
        title: 'Large files untouched for 30 days on one filesystem',
        language: 'bash',
        code: `sudo find /data -xdev -type f -size +1G -mtime +30 \\
  -printf '%s %u %TY-%Tm-%Td %p\\n' | sort -nr | head -50`,
      },
    ],
    tags: ['find', 'disk'],
  },
  {
    id: 'itv-mylnx-22',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you identify which process is writing to a file in real time?',
    probing:
      'Whether you know lsof/fuser for open handles and inotify or auditd when writers open and close too quickly to catch.',
    answer: [
      'I start with `sudo lsof /path/file` or `sudo fuser -v /path/file` — both show which processes currently have the file open. I confirm the PID and command with `ps -fp <pid>`, and check its systemd unit with `systemctl status <service>`.',
      "To watch activity over time, `inotifywait -m /path/file` shows changes as they happen. If the file gets opened and closed too quickly to catch that way, Linux's audit subsystem is more reliable.",
      "I remove the temporary audit rule once I'm done. I don't stop a process until I know whether it's a legitimate writer, a misconfigured service, or something suspicious.",
    ],
    followUps: [
      'How would you make that audit rule persistent, and what is the performance cost?',
      'What if the writer is inside a container?',
    ],
    code: [
      {
        title: 'Temporary audit rule for writes',
        language: 'bash',
        code: `sudo auditctl -w /path/file -p wa -k file_write
sudo ausearch -k file_write`,
      },
    ],
    tags: ['processes', 'auditd', 'files'],
  },
  {
    id: 'itv-mylnx-23',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A log file shows junk characters. How do you check and recover it?',
    probing:
      'Whether you identify the real file type and encoding on a copy before assuming corruption.',
    answer: [
      'I keep a copy first, then check what the file actually is.',
      "It might be compressed, UTF-16, contain ANSI control codes, or just be a binary application log rather than corrupted text. I try a safe conversion on the copy — for example `iconv -f UTF-16 -t UTF-8 input > output` — and use `less -R`, `strings`, or the application's own log viewer as needed.",
      'I also check for disk errors, an interrupted rotation, or multiple processes writing incompatible formats to the same file. If integrity checks fail, I restore the log from backup or a central logging system rather than overwrite the only copy of the evidence during an incident.',
    ],
    code: [
      {
        title: 'Identify the file type',
        language: 'bash',
        code: `file app.log
xxd -l 64 app.log
gzip -t app.log.gz       # if it is expected to be gzip`,
      },
    ],
    tags: ['logs', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-24',
    level: 'basic',
    kind: 'open',
    prompt: 'Where are Apache logs usually located?',
    probing:
      'Whether you know the distro defaults and confirm the real log path from configuration.',
    answer: [
      "On Debian and Ubuntu, they're usually under `/var/log/apache2/`; on RHEL-family systems, under `/var/log/httpd/`. The common files are `access.log` and `error.log`, but virtual hosts can point to separate files.",
      'I confirm the actual path from configuration rather than assuming it.',
      'For a failed request, I match the timestamp, client IP, URL, and status code in the access log, then use the request ID or timestamp to find the matching entry in the error log and any upstream application logs.',
    ],
    code: [
      {
        title: 'Find Apache log paths from config',
        language: 'bash',
        code: `apachectl -S
grep -R "^[[:space:]]*\\(CustomLog\\|ErrorLog\\)" /etc/apache2 /etc/httpd 2>/dev/null
journalctl -u apache2 --since today   # or httpd`,
      },
    ],
    tags: ['apache', 'logs'],
  },
  {
    id: 'itv-mylnx-25',
    level: 'basic',
    kind: 'open',
    prompt: 'What logs appear under `/var/log`?',
    probing:
      'Whether you know the common log files and that many systems now log primarily to the systemd journal.',
    answer: [
      'Typical examples are authentication logs (`auth.log` or `secure`), general system messages (`syslog` or `messages`), kernel messages, package manager history, `audit/audit.log`, cron logs, boot logs, and application directories like `nginx`, `apache2`, or `containers`. Rotated files usually end in `.1` or `.gz`.',
      "The exact set depends on the distribution, because many systems now send most service output to the systemd journal instead of a flat file. I use `journalctl -u <service>`, `journalctl -p err`, and `journalctl --since ...` alongside whatever's in `/var/log`.",
      'I check permissions and never truncate or change production logs during an investigation without preserving the evidence first.',
      'Log locations vary by Linux distribution and by which service manager it uses. `tail -n 4 /var/log/messages` prints the last four lines of that file, if it exists. For centralized logging, keep timestamps, host and service identity, and access controls intact, and let `logrotate` handle retention, compression, and safely rotating large files.',
    ],
    tags: ['logs', 'journalctl'],
  },
  {
    id: 'itv-mylnx-26',
    level: 'basic',
    kind: 'open',
    prompt: 'What is log rotation?',
    probing: 'Whether you know how logrotate works and the reload versus copytruncate trade-off.',
    answer: [
      'Log rotation stops a constantly growing log file from filling up the disk. Based on time or size, the current file gets renamed, older copies may be compressed, and anything past the retention limit gets deleted.',
      'On Linux this is usually driven by `/etc/logrotate.conf` and files under `/etc/logrotate.d/`.',
      'Before changing a rule, I test it with `logrotate -d /etc/logrotate.conf`. A service that keeps a file open needs a `postrotate` step to reload it — for example `systemctl reload nginx`. `copytruncate` is a fallback option, but it can lose a small amount of data.',
      'I check permissions, ownership, any retention or compliance requirements, disk usage, and the next scheduled run rather than just forcing a rotation blindly.',
    ],
    tags: ['logs', 'logrotate'],
  },
  {
    id: 'itv-mylnx-27',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A service is consuming 100% CPU. How will you find and fix it?',
    probing:
      'Whether you distinguish one core from the whole machine, find the hot thread, gather runtime evidence and fix the cause.',
    answer: [
      'Short answer: use `top`, `htop`, `vmstat`, and `iostat` to find the process, then kill or fix it, and scale the infrastructure if needed.',
      'First I check whether "100%" means one core or the whole machine, using `top`, `mpstat -P ALL 1`, and `pidstat -u -p ALL 1`. I find the PID and its busiest threads with `top -H -p <pid>`, then compare when it started and when CPU usage rose against traffic, cron jobs, deployments, and the service\'s own logs.',
      'What I check next depends on the runtime: a Java thread dump (`jstack`), a .NET dump, a Python stack trace, or `strace -p <pid>` for a short, controlled window.',
      'If customers are affected, I rate-limit traffic, pull the unhealthy instance out of the load balancer, scale up healthy replicas, or restart it gracefully after collecting evidence.',
      'The real fix might be correcting an infinite loop, improving a query or index, adding a timeout, setting a resource limit, or adding capacity. Afterward I check CPU, latency, errors, and actual business transactions, and add an alert or regression test for what I found.',
      'Detailed interview approach: I start by confirming scope and preserving access, then look at CPU with `uptime`, `mpstat`, `pidstat`, and `top`, comparing the busy PID against logs, traffic, and any recent changes. I work out whether it is a real capacity problem, a stuck process, or I/O wait showing up as load, and I take the smallest safe action — reducing traffic, a graceful restart, or scaling — based on the evidence I have gathered.',
      'I then confirm the application is healthy and check the resource trend, and put in retention, limits, alerts, or a code/config fix so I am not just restarting things blindly next time.',
    ],
    followUps: [
      'How would you tell user CPU from system CPU or steal time, and what does each point to?',
      'How would you profile a Java process that is pegging one core?',
    ],
    tags: ['cpu', 'troubleshooting', 'performance'],
  },
  {
    id: 'itv-mylnx-28',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A process is causing high memory usage. How do you locate and stop it?',
    probing:
      'Whether you check system pressure and per-process RSS, separate leaks from cache, and preserve diagnostics before stopping it.',
    answer: [
      'I check both overall system pressure and the specific process.',
      'RSS is resident memory; VSZ alone can be misleading. I check swap activity, OOM messages (`journalctl -k | grep -i oom`), container or cgroup limits, the request load, and whether memory keeps climbing, which points to a leak.',
      "Where it's safe, I capture a heap dump or runtime metrics before stopping the process. I use `systemctl stop` or `kill -TERM` first, and only `kill -KILL` if a graceful shutdown fails.",
      'Then I fix the actual leak or cache setting, set realistic limits and alerts, and load-test the fix.',
      '**Troubleshooting a memory leak on a production Linux server**',
      "1. Confirm the trend. Check `free -h`, `vmstat 1`, and your monitoring dashboards. Is memory climbing steadily and never coming back down?\n2. Find the process. Use `ps aux --sort=-%rss | head`, `top` (the RES column), or `smem` for a more accurate view. Watch RSS over time with a small loop.\n3. Check for OOM kills with `dmesg -T | grep -i oom` or `journalctl -k`.\n4. Dig into the process using the right tool for its runtime: JVM heap dumps (`jmap`, `jcmd`, then Eclipse MAT), Go's `pprof`, Python's `tracemalloc`/`objgraph`, or native tools like `valgrind`/`heaptrack`.\n5. Tell a real leak apart from normal caching. Page cache shows up under `buff/cache` and is reclaimable whenever the kernel needs the space back — that's expected, not a leak.\n6. Mitigate now: restart or roll the process, add memory limits (cgroups or systemd's `MemoryMax`), and enable automatic restarts. Then fix the actual bug in the code.",
    ],
    followUps: [
      'How do cgroup memory limits change what the OOM killer does inside a container?',
      'How would you prove a leak rather than a cache that has not been reclaimed yet?',
    ],
    code: [
      {
        title: 'System and process memory checks',
        language: 'bash',
        code: `free -m
vmstat 1
ps -eo pid,ppid,user,%mem,rss,vsz,cmd --sort=-rss | head
pmap -x <pid> | tail -1`,
      },
      {
        title: 'Watch RSS over time',
        language: 'bash',
        code: `while true; do ps -o rss= -p <pid>; sleep 5; done`,
      },
    ],
    tags: ['memory', 'troubleshooting', 'performance'],
  },
  {
    id: 'itv-mylnx-29',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are zombie processes and how do you remove them?',
    probing:
      'Whether you understand that zombies are already dead, must be reaped by the parent, and how orphans differ.',
    answer: [
      "A zombie is a child process that has already exited, but whose parent hasn't called `wait()` to collect its exit status yet. It uses almost no memory or CPU, but it still holds a slot in the process table. I find them with `ps -eo pid,ppid,state,cmd | awk '$3==\"Z\"'` and then look at the parent PID.",
      "Sending a signal to a zombie does nothing, since it's already dead. I first try asking the parent to reload or restart gracefully; when the parent itself exits, PID 1 normally adopts and cleans up any leftover zombies. If the parent is broken, kill the parent instead — the zombie is re-parented to init and reaped from there. You cannot `kill -9` a zombie.",
      'If zombies keep piling up, the real fix belongs in the parent program — it needs to handle `SIGCHLD` and call `wait` or `waitpid`. I also check the process-count limit, since enough zombies can actually prevent new processes from starting.',
      'An orphan is a child process whose parent died first. It gets re-parented to init or systemd (PID 1) right away, and PID 1 reaps it when it exits. This is normally harmless.',
      'In containers, run an init process (`--init` or `tini`) so PID 1 can reap zombies properly.',
    ],
    tags: ['processes', 'zombie'],
  },
  {
    id: 'itv-mylnx-30',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you fix "Too many open files" in Linux?',
    probing:
      'Whether you separate per-process from system-wide limits, raise limits correctly for systemd services, and chase the leak.',
    answer: [
      'I figure out whether this is a per-process limit or a system-wide one. I check `cat /proc/<pid>/limits`, count descriptors with `ls /proc/<pid>/fd | wc -l`, look at what they are with `lsof -p <pid>`, and check `/proc/sys/fs/file-nr`.',
      'Repeated sockets or files of the same type usually point to a leak somewhere.',
      'For a systemd service, a controlled way to raise the limit is a `LimitNOFILE` setting in the unit.',
      'After `systemctl daemon-reload`, I restart during an approved window and confirm the new limit with `/proc/<new-pid>/limits`. Raising the limit only buys time if the application is leaking connections, so I also fix how it closes or pools connections, tune traffic if needed, and set an alert well before the new limit is hit.',
    ],
    followUps: [
      'Why does editing /etc/security/limits.conf not affect a systemd service?',
      'How would you find which connections are leaking?',
    ],
    code: [
      {
        title: 'systemd unit override',
        language: 'text',
        code: `[Service]
LimitNOFILE=65536`,
      },
    ],
    tags: ['limits', 'file descriptors', 'systemd'],
  },
  {
    id: 'itv-mylnx-31',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you analyze high system load?',
    probing:
      'Whether you know load includes I/O-blocked tasks and can use a USE-style method to find the real bottleneck.',
    answer: [
      "Load average counts both runnable tasks and tasks stuck waiting on I/O, so it's not the same thing as CPU percentage. I compare the 1/5/15-minute load numbers against the CPU count, then use `vmstat 1` (looking at run/block queues and swap), `mpstat -P ALL 1`, `iostat -xz 1`, and `pidstat -dur 1` to figure out what the actual bottleneck is.",
      'A high run-queue with busy CPUs points to CPU contention. A high block count, I/O wait, or long disk queues point to storage. Swapping and major page faults point to memory pressure. I also check `ps` for processes stuck in D state and look at NFS or downstream service latency.',
      'I address whatever resource or workload is actually the problem, compare it against the normal baseline and any recent changes, and confirm latency and errors actually recover — not just that the load number dropped.',
      'Use the USE method across CPU, memory, disk, and network: for each one, check utilization, saturation (how close it is to its limit), and errors.',
      '- Compare `uptime` / load average against the number of cores; watch `top` or `htop`.\n- CPU-bound? High `%us`/`%sy` with low idle time points to a specific process — find it and profile it.\n- IO-bound? High `wa`, or processes stuck in `D` state — see the disk I/O latency checks.\n- Memory pressure or swapping? Check `free` and the `si`/`so` columns in `vmstat` — see the memory leak steps.\n- Too many runnable threads, or a fork bomb? Check the run queue (`r` column) in `vmstat`.',
      'Compare the timing against recent deploys, cron jobs, or traffic spikes. To resolve it: scale out or up, fix the offending process, add resource limits, or tune the workload.',
    ],
    followUps: [
      'Why can a box show a load of 40 with mostly idle CPUs?',
      'What does CPU steal time tell you on a cloud VM?',
    ],
    tags: ['performance', 'load', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-32',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you debug a kernel panic?',
    probing:
      'Whether you prioritise restoring service while preserving the panic evidence, and know kdump and the crash tool.',
    answer: [
      "My first priority is saving the panic message and getting service back up through the approved failover or reboot procedure. I collect the console or serial output, hypervisor events, the previous boot's journal (`journalctl -k -b -1`), and any crash dump under `/var/crash`.",
      'I note the kernel version and any recent changes to drivers, kernel, firmware, hardware, or workload.',
      "If `kdump` is set up, I analyze the matching unstripped kernel and crash dump with the `crash` tool, or hand them to the vendor. I look for the module that faulted, the stack trace, machine-check errors, OOM or panic settings, and whether it's reproducible.",
      'A temporary fix might be rolling back a kernel or driver, or moving the workload elsewhere. The real fix is a patched kernel, driver, or replacing failed hardware. I make sure `kdump` works and console access is ready before the next incident.',
    ],
    followUps: [
      'How do you configure and test kdump before you need it?',
      'What would make you suspect hardware rather than a driver?',
    ],
    tags: ['kernel', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-33',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you fix NTP time sync issues?',
    probing:
      'Whether you can use chrony diagnostics and know why stepping a large clock offset is risky.',
    answer: [
      'I check `timedatectl`, `chronyc tracking`, and `chronyc sources -v` to see the offset, which source is selected, and whether sources are reachable. Then I confirm the time service is running, its configured sources actually resolve, and UDP port 123 is allowed through.',
      "On virtual machines, I also check whether the hypervisor's own time sync is enabled and conflicting.",
      "For a large offset, jumping the clock can break databases and authentication, so I follow the application's maintenance procedure. For a small offset, chrony should adjust it gradually and safely. After fixing `/etc/chrony.conf`, I reload or restart chronyd and confirm the offset is shrinking and a source is marked selected (`^*`).",
      "I keep monitoring drift, and use multiple approved internal time sources so a single NTP server isn't a single point of failure.",
    ],
    tags: ['ntp', 'chrony'],
  },
  {
    id: 'itv-mylnx-34',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A scheduled cron job is not executing. How do you debug?',
    probing:
      "Whether you know cron's minimal environment and check schedule, daemon, logs, paths and permissions systematically.",
    answer: [
      'I check the crontab for the right user with `crontab -l -u user`, confirm the five time fields and timezone are correct, and that `cron` or `crond` is actually running. Then I check `journalctl -u cron` or `/var/log/cron`, and any mail output cron generates.',
      'Cron runs with a small environment and a different working directory than an interactive shell, so I use absolute paths for commands and files, a valid shebang, executable permissions, and explicitly set any variables the job needs. A useful temporary test entry is below.',
      'I run the exact same command as the cron user with a clean environment, check for locking issues and SELinux/AppArmor denials, and confirm the expected output actually happened. For anything important, I add failure alerting and make sure a retry is safe to run again without causing problems.',
    ],
    code: [
      {
        title: 'Temporary cron test entry with logging',
        language: 'text',
        code: `*/5 * * * * /opt/jobs/report.sh >>/var/log/report-cron.log 2>&1`,
      },
    ],
    tags: ['cron', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-35',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you schedule a cron job every 15 minutes?',
    probing:
      'Whether you can write the cron expression and know it is clock-aligned, plus how to prevent overlapping runs.',
    answer: [
      'The crontab entry uses `*/15` in the minute field.',
      'This runs at minutes 0, 15, 30, and 45 of every hour — not fifteen minutes after the previous run finishes. I use absolute paths, set the shebang and executable permission, and install it under the right service account.',
      'If overlapping runs would be unsafe, I wrap it with `flock -n /run/collect-metrics.lock ...`. I test the script as that user and add monitoring, since cron itself only proves the job started, not that the actual task succeeded.',
    ],
    code: [
      {
        title: 'Every 15 minutes',
        language: 'text',
        code: `*/15 * * * * /usr/local/bin/collect-metrics.sh >>/var/log/collect-metrics.log 2>&1`,
      },
    ],
    tags: ['cron'],
  },
]
