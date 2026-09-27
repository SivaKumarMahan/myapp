import type { InterviewQuestion } from '../../../types'

/** Linux disks, filesystems, storage incidents, performance, security and boot. */
export const myLinuxStorageQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mylnx-36',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What happens when `/` is 100% full?',
    probing:
      'Whether you know the knock-on failures of a full root filesystem, check inodes too, and recover without blind deletes.',
    answer: [
      "When root fills up, applications can't write logs, PID files, temp files, package databases, uploads, or database transactions. Services can crash or fail to start, and even logging in can fail if PAM or the shell can't write what it needs.",
      'Running out of inodes causes the exact same symptom even when `df -h` shows free space, so I check both `df -hT` and `df -i`.',
      "I make sure I can still get in, find the filesystem that's growing and the safest large files to deal with, and cut down on writes where I can. I rotate or archive known logs, clear approved caches or temp data, or add storage — I never blindly delete things under `/var/lib`.",
      "Once it's recovered, I restart only the services that were actually affected, check filesystem and application integrity, confirm monitoring is working, and fix retention or capacity so it can't silently happen again.",
    ],
    tags: ['disk', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-37',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'The `/` partition is full. How do you find and delete large files safely?',
    probing:
      'Whether you stay on the affected filesystem, verify ownership and open handles, and clean up the smallest safe amount.',
    answer: [
      'I confirm the filesystem with `df -hT /` and inodes with `df -i /`, then stay on that same filesystem while I look for usage.',
      "Before deleting anything, I check who owns it, when it was last modified, whether anything has it open, retention rules, and whether a mount is hiding data underneath it. Logs should normally go through `logrotate` or get safely reopened by the service, and application or database files need to follow the owner's own procedure.",
      "I make the smallest cleanup that actually recovers space, confirm `df`, service health, and logs afterward, then set up rotation, quotas, alerts, or an expansion. I also check `lsof +L1` if `du` can't explain what `df` is reporting.",
    ],
    code: [
      {
        title: 'Largest directories and files on the root filesystem',
        language: 'bash',
        code: `sudo du -xhd1 / 2>/dev/null | sort -h
sudo find / -xdev -type f -size +500M -printf '%s %p\\n' 2>/dev/null | sort -nr | head`,
      },
    ],
    tags: ['disk', 'find'],
  },
  {
    id: 'itv-mylnx-38',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'Deleted large files but disk space is not freeing up. Why?',
    probing:
      'Whether you know deleted-but-open files keep blocks allocated and how to release them safely.',
    answer: [
      'Linux removes the filename right away, but the actual data blocks stay allocated as long as any process still has the file open. I confirm this with `sudo lsof +L1`.',
      "The output shows the process, PID, file descriptor, and how much space it's holding onto. The safest fix is to reload or restart that service so it closes and reopens the file — for some daemons, a documented signal like `SIGHUP` is enough.",
      "In an emergency, truncating through `/proc/<pid>/fd/<fd>` is possible but risky, and I'd only do it following an approved procedure. I confirm the space is freed with `df`, then fix the rotation setup so it properly signals the service next time.",
    ],
    code: [
      {
        title: 'Find deleted-but-open files',
        language: 'bash',
        code: `sudo lsof +L1   # open files with link count 0`,
      },
    ],
    tags: ['disk', 'lsof'],
  },
  {
    id: 'itv-mylnx-39',
    level: 'advanced',
    kind: 'open',
    prompt: 'What happens when a file is deleted but still open by a process?',
    probing: 'Whether you understand unlink, inodes and file descriptors at the kernel level.',
    answer: [
      "`unlink()` removes the directory entry, so new commands can't find the file by name anymore, but the inode and its data blocks stay around until the last open file descriptor closes. The process that has it open can keep reading or writing that data, and `df` still counts it as used space even though `du` can't see it.",
      'I demonstrate or diagnose this with `lsof +L1` and by checking `/proc/<pid>/fd/<number>`, which usually shows `(deleted)`. To free it, I get the application to close the descriptor — normally through a graceful reload or restart.',
      "This is also why replacing a deployed binary on disk doesn't automatically change the code a running process already has loaded in memory.",
    ],
    followUps: [
      'How could you recover the contents of such a file before the process exits?',
      'Why does logrotate need a postrotate reload for this reason?',
    ],
    tags: ['filesystem', 'inodes'],
  },
  {
    id: 'itv-mylnx-40',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'What is inode exhaustion and how do you resolve it?',
    probing:
      'Whether you can diagnose "No space left on device" with free blocks and find the source of millions of small files.',
    answer: [
      'Every file and directory needs an inode.',
      'A filesystem full of millions of tiny files can hit 100% inode usage while plenty of data blocks are still free — a new file then fails with "No space left on device." I check `df -i` and narrow down which directories have the most files, for example with `find /var -xdev -type f -printf \'%h\\n\' | sort | uniq -c | sort -nr | head`.',
      "I figure out what actually created all those files — sessions, a mail queue, a cache, container layers, or unrotated temp data — and clean it up using that system's own supported method.",
      "For a lasting fix, I might move the workload, redesign how storage or objects are used, or rebuild the filesystem with an inode density suited to the workload — inode count generally can't be increased in place on ext filesystems.",
      'I add monitoring for file count as well as bytes used.',
    ],
    followUps: [
      'How does XFS handle inode allocation differently from ext4?',
      'How would you safely delete millions of small files without hurting the server?',
    ],
    tags: ['inodes', 'disk'],
  },
  {
    id: 'itv-mylnx-41',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Why do `df -h` and `du -sh` show different usage?',
    probing: 'Whether you know the common causes of df/du discrepancies and how to check each.',
    answer: [
      "`df` reads the filesystem's own allocation metadata, while `du` walks the visible directory tree and adds up what it finds. The most common cause of a big difference is a deleted-but-open file, which I check with `lsof +L1`.",
      'Other causes: reserved blocks or metadata overhead, files hidden underneath a mount point, not having permission to see everything during the `du` scan, snapshots, or comparing two different filesystems by mistake.',
      'I make sure both commands are looking at the same mount (`findmnt` and `du -x`), run `du` with enough permission, check for open-deleted files and snapshots, and check mount points. Sparse files can go the other way — `ls -l` can show a large size while the file actually takes up little space — and `du --apparent-size` explains that.',
      'I fix whatever the actual cause turns out to be, rather than trusting either number blindly.',
    ],
    tags: ['disk', 'df/du'],
  },
  {
    id: 'itv-mylnx-42',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you check disk partitions and usage?',
    probing:
      'Whether you know which command shows which storage layer and that each layer must be grown separately.',
    answer: [
      'I use a different command for each layer: `lsblk -f` shows disks, partitions, filesystems, UUIDs, and mount points. `df -hT` shows how full each mounted filesystem is. `findmnt` shows how things are mounted and with what options. `blkid` confirms filesystem identifiers. `fdisk -l` or `parted -l` shows the partition table.',
      'For LVM, I also run `pvs`, `vgs`, and `lvs -a -o +devices` to see how physical volumes map to volume groups and logical volumes. Before changing anything, I write down this mapping and confirm the exact device by size, serial number, and path.',
      "Cloud disk size, partition size, LVM size, filesystem size, and actual mounted capacity are all separate layers, and growing one doesn't automatically grow the others.",
    ],
    tags: ['disk', 'lvm'],
  },
  {
    id: 'itv-mylnx-43',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you extend a partition without unmounting it?',
    probing:
      'Whether you can grow each layer (disk, partition, PV, LV, filesystem) online and know XFS versus ext4 differences.',
    answer: [
      'I first confirm the layout and filesystem with `lsblk -f`, `findmnt`, and the LVM commands, take a backup or snapshot, and check that the filesystem actually supports growing while mounted. After the underlying cloud or virtual disk is expanded, a plain partition can sometimes be grown with `growpart /dev/sda 2`.',
      'For LVM, a typical controlled flow is below.',
      "The exact device names vary every time, so I never just paste commands without checking them against the real layout. I verify each layer afterward with `pvs`/`lvs`, `lsblk`, and `df -hT`. Shrinking is a very different, riskier operation, and XFS can't be shrunk in place at all.",
    ],
    followUps: [
      'What does `lvextend -r` do?',
      'How would you shrink an ext4 logical volume safely?',
    ],
    code: [
      {
        title: 'Online LVM extend',
        language: 'bash',
        code: `sudo pvresize /dev/sda2
sudo lvextend -L +10G /dev/vg0/data
sudo xfs_growfs /data              # XFS, use mount point
# or: sudo resize2fs /dev/vg0/data # ext4`,
      },
    ],
    tags: ['lvm', 'disk', 'filesystem'],
  },
  {
    id: 'itv-mylnx-44',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What steps are needed to add a new disk to a Linux server?',
    probing:
      'Whether you identify the disk safely, use UUIDs in fstab and validate before rebooting.',
    answer: [
      "Once the platform attaches the disk, I identify it by serial number and size with `lsblk -o NAME,SIZE,TYPE,SERIAL,MOUNTPOINTS` — I never just assume it's `/dev/sdb`. I confirm it has no data on it that matters, create a GPT partition if needed, then set up the approved filesystem or add it to LVM.",
      "I create the mount point, mount it temporarily, set ownership, and test that I can read and write to it. For it to survive a reboot, I use the filesystem's UUID from `blkid` in `/etc/fstab` rather than a device name that could change.",
      'I validate with `findmnt --verify` and `mount -a` before actually rebooting, then confirm capacity and permissions. I also update backups, monitoring, and application configuration to cover the new location.',
    ],
    tags: ['disk', 'fstab'],
  },
  {
    id: 'itv-mylnx-45',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you mount and unmount (attach and detach) filesystems in Linux?',
    probing:
      'Whether you can mount safely, persist via fstab and handle a busy unmount without forcing it.',
    answer: [
      '"In Linux, we attach a file system by mounting it with the `mount` command — for example, `mount /dev/sdb1 /mnt/data`. To detach it, we use `umount /mnt/data`. For a mount that should survive a reboot, we set it up in `/etc/fstab`. I also check usage with `df -h` and handle busy mounts using `lsof` or `fuser`."',
      'When you "attach" a file system in Linux, you\'re mounting it — linking a device, partition, or volume into your system\'s directory tree. When you "detach" a file system, you\'re unmounting it — safely removing access to that device.',
      'In practice I create an empty mount point and mount it using the UUID with an explicit filesystem type and options, for example `mount -t xfs UUID=<uuid> /data`. I confirm with `findmnt /data`, test permissions, and only add a reviewed entry to `/etc/fstab` once the temporary mount is working.',
      '`findmnt --verify` and `mount -a` catch fstab syntax errors before they cause problems at the next reboot.',
      'Before running `umount /data`, I stop or redirect whatever applications are using it, and check `lsof +f -- /data` or `fuser -vm /data` if it says it\'s busy ("target is busy"). I avoid lazy or forced unmounts unless I fully understand the risk of data loss or stale file handles.',
      "After unmounting, I confirm it's gone from `findmnt` — writing beneath a mount point that isn't actually mounted, or leaving a stray mount point, can quietly fill up the root filesystem.",
    ],
    code: [
      {
        title: 'Attach (mount) a filesystem',
        language: 'bash',
        code: `# 1. Create a directory (mount point)
sudo mkdir /mnt/mydata

# 2. Identify your storage device
sudo fdisk -l    # lists available disks and partitions
# Example device: /dev/sdb1

# 3. Mount it to the directory
sudo mount /dev/sdb1 /mnt/mydata

# 4. Verify
df -h | grep mydata`,
      },
      {
        title: 'Detach (unmount) and handle a busy target',
        language: 'bash',
        code: `sudo umount /mnt/mydata
# umount: /mnt/mydata: target is busy

sudo lsof +f -- /mnt/mydata
# or
sudo fuser -vm /mnt/mydata`,
      },
    ],
    tags: ['mount', 'filesystem'],
  },
  {
    id: 'itv-mylnx-46',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you create and mount a swap file?',
    probing:
      'Whether you can create swap correctly with secure permissions and know swap is not a fix for memory problems.',
    answer: [
      'I first check `free -h`, `swapon --show`, how much disk space is available, and whether the workload or platform even supports a swap file.',
      'I confirm it with `swapon --show` and `free -h`, then add `/swapfile none swap sw 0 0` to `/etc/fstab`. Mode `600` matters here, because swap can contain sensitive data that was in memory.',
      "Swap can prevent a sudden OOM kill for some workloads, but it's much slower than RAM and isn't a substitute for fixing a memory leak or sizing memory correctly. I also pick and document an appropriate `vm.swappiness` value rather than changing it without evidence.",
    ],
    code: [
      {
        title: 'Create and enable a swap file',
        language: 'bash',
        code: `sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile`,
      },
    ],
    tags: ['swap', 'memory'],
  },
  {
    id: 'itv-mylnx-47',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you remount a filesystem read-write without rebooting?',
    probing:
      'Whether you distinguish an intentional ro mount from a kernel error remount, where forcing rw causes more damage.',
    answer: [
      'If it was mounted read-only on purpose and the filesystem is healthy, I use `sudo mount -o remount,rw /mountpoint` and confirm with `findmnt -no OPTIONS /mountpoint`. If this needs to survive a reboot, I update `/etc/fstab` too.',
      'But if the kernel remounted it read-only itself because of I/O or filesystem errors, forcing it back to read-write can make corruption worse. In that case I first check `journalctl -k`, storage or cloud health, and SMART data.',
      'I fail over or stop writes, back up whatever is still readable, unmount or boot into rescue mode, run the proper filesystem repair tool, and only remount once the underlying storage problem is actually fixed.',
    ],
    tags: ['mount', 'filesystem'],
  },
  {
    id: 'itv-mylnx-48',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you fix a corrupted filesystem using `fsck`?',
    probing:
      'Whether you protect data first, use the right repair tool per filesystem and never run it on a mounted filesystem.',
    answer: [
      '`fsck` is really a front end mainly for ext-family filesystems; XFS uses `xfs_repair` instead, and the filesystem normally needs to be unmounted first. I confirm the exact device and filesystem type with `lsblk -f` and protect the data first.',
      'For the root filesystem, I boot into rescue or emergency mode, or attach the disk to a separate recovery host.',
      "For ext4, I might first run a read-only check with `e2fsck -fn /dev/mapper/vg-lv`, review what it finds, then run the actual repair while it's unmounted. I avoid the automatic `-y` flag on valuable data unless the recovery plan is fine with that risk.",
      "Afterward I mount it read-only first if that makes sense, check `lost+found`, validate the application's data, and look into whatever underlying disk, power, or kernel issue caused the corruption in the first place, rather than treating it as a one-off event.",
    ],
    followUps: [
      'Why is running fsck on a mounted filesystem dangerous?',
      'What would you do if xfs_repair refuses to run because of a dirty log?',
    ],
    tags: ['filesystem', 'fsck'],
  },
  {
    id: 'itv-mylnx-49',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you recover a deleted file in Linux?',
    probing:
      'Whether you stop writes immediately, try recovery sources in order of reliability and set honest expectations.',
    answer: [
      "I stop or reduce writes right away, since new data can overwrite the blocks the deleted file used. My order of options is: the application's own recycle bin or version history, backups, a storage or LVM snapshot, a replica, and then an open file descriptor (`lsof +L1`) that might still let me copy from `/proc/<pid>/fd/<fd>` to another filesystem.",
      "If none of that works, I unmount or snapshot the filesystem and do any forensic recovery on a copy, using filesystem-specific tools. Recovery isn't guaranteed, especially on SSDs with TRIM enabled, so I set that expectation up front and preserve the evidence.",
      'Once I have a recovered file, I check it with a checksum or against the application, restore the correct owner and permissions, document the incident, and push for better tested backups and deletion controls.',
    ],
    followUps: [
      'Why does TRIM make recovery on SSDs so unlikely?',
      'What deletion controls would you put in place afterwards?',
    ],
    tags: ['recovery', 'filesystem'],
  },
  {
    id: 'itv-mylnx-50',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A Linux server is not booting due to filesystem corruption. How do you recover it?',
    probing:
      'Whether you can work from console or rescue media, separate fstab and bootloader faults from real corruption and repair safely.',
    answer: [
      'I use console access to capture the exact boot error and tell the difference between real filesystem corruption and a bad `/etc/fstab` entry, a missing device, or a bootloader problem. I boot into recovery or rescue media, or attach the root disk to a helper host, map any encrypted or LVM volumes, and take a snapshot before doing any repair.',
      'With the affected filesystems unmounted, I run the right checker — `e2fsck` for ext, `xfs_repair` for XFS — review the UUIDs and options in `/etc/fstab`, and check disk or platform health. I mount it read-only and check the critical files before bringing it back into service.',
      "I only rebuild initramfs or the bootloader if the evidence points there, reboot through console, verify all mounts and services and application consistency, and restore from backup if the repair can't guarantee the data is intact.",
    ],
    followUps: [
      'How would you do this for a cloud VM with no physical console?',
      'How can the `nofail` fstab option help, and when is it dangerous?',
    ],
    tags: ['boot', 'filesystem', 'recovery'],
  },
  {
    id: 'itv-mylnx-51',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you check disk I/O performance and debug high I/O latency?',
    probing:
      'Whether you read iostat latency and queue metrics, find the process, and tie saturation to real application impact.',
    answer: [
      'I start with `iostat -xz 1`, `vmstat 1`, and `pidstat -d 1`. I compare throughput and IOPS against what the disk is actually rated for, and look at `await`, average queue size, utilization, and how much CPU time is spent waiting on I/O.',
      '`iotop` helps pin down the exact process, and cloud metrics can reveal throttled IOPS or throughput, or exhausted burst credits.',
      "High utilization by itself isn't necessarily bad — the real evidence is rising latency and actual application impact. I compare it against backups, queries, compaction jobs, deployments, and kernel or storage errors happening around the same time.",
      'Watch `await` (the average I/O wait time in milliseconds) and `%util` — close to 100% means the device is saturated. Also check the `wa` column in `vmstat`, which shows CPU time spent waiting on I/O, and look for processes stuck in uninterruptible sleep (`D` state).',
      'Common causes are an undersized or degraded disk (for example, EBS gp2 running out of burst credits and getting throttled), a noisy neighbor, swapping, heavy fsync activity, or filesystem fragmentation.',
      'Fixes can include tuning a query or index, adding caching, batching writes, moving batch jobs to a quieter time, separating data and log volumes onto different disks, moving hot data to faster storage, provisioning more IOPS or throughput, or scaling up. I take a baseline and remeasure the same workload after making the change.',
    ],
    followUps: [
      'Why is %util misleading on SSDs and RAID devices?',
      'How would you confirm the cloud provider is throttling the volume?',
    ],
    code: [
      {
        title: 'I/O investigation commands',
        language: 'bash',
        code: `iostat -xz 1        # %util, await per device
iotop               # per-process IO
dstat / sar -d      # historical
pidstat -d 1        # per-process disk IO
ps aux | awk '$8 ~ /D/'   # processes in uninterruptible sleep`,
      },
    ],
    tags: ['performance', 'disk', 'io'],
  },
  {
    id: 'itv-mylnx-52',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is the fastest way to copy huge files across servers?',
    probing:
      'Whether you pick the transfer method based on network and data, and plan a live copy plus final delta sync.',
    answer: [
      'The best method depends on the network, how much is changing, how many files there are, and whether any downtime is acceptable. For a large, resumable transfer I usually use `rsync`.',
      "Compression (`-z`) helps on a slower network if the data compresses well, but wastes CPU on data that's already compressed. I run an initial copy while the source is still live, then pause writes or take a snapshot, then run a final delta sync to catch up.",
      'For cloud volumes, a snapshot, replication, or object storage might be faster and safer than a file copy. I estimate the bandwidth and disk space needed, protect any credentials involved, throttle the transfer if it would affect production, and verify file counts and checksums before cutting over.',
    ],
    code: [
      {
        title: 'Resumable rsync preserving metadata',
        language: 'bash',
        code: `rsync -aHAX --info=progress2 --partial source/ user@host:/data/destination/`,
      },
    ],
    tags: ['rsync', 'data transfer'],
  },
  {
    id: 'itv-mylnx-53',
    level: 'basic',
    kind: 'open',
    prompt: 'What are hard links and soft links?',
    probing:
      'Whether you understand inode-level hard links versus path-based symlinks and their practical uses.',
    answer: [
      'A hard link is just another directory entry pointing at the same inode. Both names are equally valid references to the same file — deleting one name leaves the data available through the other.',
      "Hard links normally can't cross filesystems or point at directories. `ls -li` shows the shared inode number and the link count.",
      'A symbolic link is a small separate file that just contains a target path: `ln -s /opt/app/current app`. It can cross filesystems and point at a directory, but it becomes a dangling link if the target moves.',
      "I use symlinks for switching between versioned releases, and hard links for certain backup or deduplication setups — keeping in mind that editing a hard-linked file changes the data everywhere it's linked, since it's all the same inode.",
    ],
    tags: ['links', 'inodes'],
  },
  {
    id: 'itv-mylnx-54',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between `find` and `locate`?',
    probing:
      'Whether you know find walks the live tree while locate queries a possibly stale index.',
    answer: [
      '`find` walks the actual directory tree right now, and can filter by name, type, owner, time, size, permissions, and filesystem, then safely act on what it finds. For example, `find /var/log -xdev -type f -mtime +30 -print` gives current, accurate matches, but it can take a while on a big tree.',
      "`locate '*.conf'` instead queries an index that `updatedb` built earlier, so it's very fast, but it can list files that were since deleted, or miss files that were just created, and which paths are excluded depends on its configuration. I use `locate` for a quick look and confirm with `stat`; I use `find` when I need completeness, the current state, or need to act on the results.",
      'Before running `find` with `-delete` or `-exec`, I always run the same expression with `-print` first to see exactly what it will touch.',
    ],
    tags: ['find'],
  },
  {
    id: 'itv-mylnx-55',
    level: 'basic',
    kind: 'open',
    prompt: 'What are runlevels or systemd targets?',
    probing:
      'Whether you can map SysV runlevels to systemd targets and know the impact of isolate.',
    answer: [
      'SysV runlevels represented boot modes — commonly 1 for single-user/rescue, 3 for multi-user text mode, 5 for graphical, and 0/6 for halt/reboot, though the exact meaning could vary by system. Systemd instead uses targets, which group units and their dependencies together — things like `rescue.target`, `multi-user.target`, and `graphical.target`.',
      "I check the default with `systemctl get-default`, change it permanently with `systemctl set-default multi-user.target`, or switch the current boot state with `systemctl isolate ...`. `isolate` can stop services that aren't required by the target it switches to, so I use console access and understand the impact before doing it.",
      "The old runlevel numbers map roughly onto targets, but systemd's dependency model is much richer than a single number.",
    ],
    tags: ['systemd', 'boot'],
  },
  {
    id: 'itv-mylnx-56',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'You need to secure a Linux server exposed to the internet with a weak root password. What steps do you take?',
    probing:
      'Whether you treat it as a possible compromise first, then harden access without locking yourself out.',
    answer: [
      'I treat this as a possible compromise, not just a hardening exercise. I restrict access at the cloud firewall to approved networks, preserve authentication and audit evidence, and review successful logins, user accounts, SSH keys, sudo changes, running processes, anything persistent, and outbound connections.',
      'If I suspect it was actually compromised, I isolate it and rebuild from a trusted image rather than trying to clean it in place.',
      'I rotate the root password and every reachable secret, create named admin accounts with least privilege — meaning only the access each person actually needs — sudo, and MFA or bastion access, test that the new access works, then set `PermitRootLogin no` and normally turn off password-based SSH entirely.',
      "I patch the system, remove services that aren't needed, turn on the host firewall and SELinux, centralize logs, and enable something like fail2ban or an EDR tool where it fits, and confirm backups are working.",
      "I make these changes with a second session or console open, so I don't lock administrators out by mistake.",
    ],
    followUps: [
      'What indicators would convince you the server was already compromised?',
      'How would you roll this hardening out across a fleet?',
    ],
    tags: ['security', 'hardening', 'ssh'],
  },
  {
    id: 'itv-mylnx-57',
    level: 'intermediate',
    kind: 'scenario',
    prompt: '`yum` or `apt` installation is failing. How do you troubleshoot?',
    probing:
      'Whether you work through disk, clock, repo reachability, locks and broken state without disabling signature checks.',
    answer: [
      'I read the actual error message first. I check disk space, inodes, and the system clock, then whether the repository is reachable over DNS, TLS, and any proxy, whether the configured release or version is right, and whether the GPG key is valid.',
      'A lock error means another `apt`, `dpkg`, `dnf`, or `yum` process is already running — I find that process rather than deleting the lock file while a transaction is in progress.',
      'On Debian-based systems I use `apt-get update`, `apt-cache policy`, `dpkg --audit`, and `dpkg --configure -a` if something got interrupted. On RHEL-based systems I use `dnf repolist -v`, `dnf makecache`, and `dnf history`.',
      "I check the repository and package logs, resolve any held or broken dependencies deliberately, and never disable signature checks. Once it's fixed, I install the exact package, confirm its version and that the service works, and put the repository configuration back to what's approved.",
    ],
    tags: ['packages', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-58',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you find the top 5 CPU-consuming and memory-consuming processes?',
    probing:
      'Whether you can sort ps output correctly and know a single snapshot needs confirming over time.',
    answer: [
      'For a snapshot I use `ps` sorted by CPU and by RSS.',
      "I sort memory by RSS, since `%mem` is derived from it and VSZ can include large chunks of memory that aren't actually resident. A single snapshot can catch a brief spike or miss one entirely, so I confirm with `pidstat 1`, `top`, or historical data from `sar`/`atop`.",
      'I also map each PID back to its service or container and compare it against request rate and any recent changes before deciding a process is actually abnormal.',
    ],
    code: [
      {
        title: 'Top CPU and memory consumers',
        language: 'bash',
        code: `ps -eo pid,ppid,user,%cpu,%mem,rss,etime,cmd --sort=-%cpu | head -n 6
ps -eo pid,ppid,user,%cpu,%mem,rss,etime,cmd --sort=-rss  | head -n 6`,
      },
      {
        title: 'Memory, CPU and process quick commands',
        language: 'bash',
        code: `free -h          # memory (human readable)
top / htop       # live CPU + memory + per-process view
vmstat 1         # memory, CPU, IO over time
ps aux --sort=-%mem | head   # top memory consumers
ps aux --sort=-%cpu | head   # top CPU consumers
mpstat -P ALL 1  # per-core CPU`,
      },
    ],
    tags: ['processes', 'cpu', 'memory'],
  },
  {
    id: 'itv-mylnx-59',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you check logs from the last 7 days?',
    probing:
      'Whether you use precise journalctl ranges and know file mtime filters are not log-entry filters.',
    answer: [
      'For systemd, I give it a precise time range and unit.',
      "For plain log files, I first find the current and rotated files under `/var/log`. Note that `find ... -mtime -7` filters by the file's modification time, not by individual log entries. I use `grep` on plain files and `zgrep` on `.gz` files, then filter further by timestamp format, request ID, host, or severity.",
      'I account for timezone differences and log rotation boundaries, and export a read-only copy when I need to preserve evidence from an incident.',
    ],
    code: [
      {
        title: 'Journal entries for a fixed window',
        language: 'bash',
        code: `journalctl -u nginx --since "2026-07-12 00:00:00" --until "2026-07-19 00:00:00" -o short-iso`,
      },
    ],
    tags: ['logs', 'journalctl'],
  },
  {
    id: 'itv-mylnx-60',
    level: 'basic',
    kind: 'open',
    prompt: 'What command generates an SSH key?',
    probing:
      'Whether you pick a modern key type, protect the private key and deploy only the public half.',
    answer: [
      'For a modern user key I use `ssh-keygen -t ed25519`. If policy or old compatibility requires RSA instead, I use RSA 3072 or 4096.',
      'This creates a private key at `~/.ssh/id_ed25519` and a public key at `~/.ssh/id_ed25519.pub`. I put it in a protected path, set a strong passphrase, and use `ssh-agent` rather than leaving the private key unencrypted on disk. The `.pub` file gets shared; the private key never gets emailed, checked into a repository, or copied onto a server.',
      'To copy the public key to a server, run `ssh-copy-id user@host` — it appends the key to `~/.ssh/authorized_keys`. I install the public key for the right account and test a second working session before removing any old access.',
    ],
    code: [
      {
        title: 'Generate SSH keys',
        language: 'bash',
        code: `ssh-keygen -t ed25519 -a 100 -C "sunil@company-laptop-2026"   # modern, preferred
ssh-keygen -t rsa -b 4096 -C "you@example.com"                # if ed25519 unsupported
ssh-copy-id user@host`,
      },
    ],
    tags: ['ssh', 'keys'],
  },
  {
    id: 'itv-mylnx-61',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'What do you do if a user loses an SSH private key?',
    probing:
      'Whether you know the key cannot be recovered, revoke it everywhere it was trusted and re-issue safely.',
    answer: [
      'You cannot recover the private key. It was never stored on the server, so it is gone for good. I treat the key as potentially compromised.',
      'Using a separate, approved admin path, I find and remove its exact public-key line from every `authorized_keys` file, bastion, Git service, and automation account that trusted it. If SSH access is lost entirely, use another path in: the cloud console or a serial connection, an SSM session, a bastion host with a separate credential, or a configuration tool like Ansible to add the new key.',
      "I check the authentication logs for that key's fingerprint or user, and rotate other secrets if the lost device could have exposed them too.",
      'The user generates a new passphrase-protected key on a trusted device, and administrators only ever receive the public half. I add it with correct ownership and permissions, test that it works, and record who owns it, why, and when it expires.',
      'I never try to reconstruct or send a replacement private key over any channel. Centralized SSH certificates or managed access make future revocation and expiry much easier to handle.',
    ],
    tags: ['ssh', 'keys', 'security'],
  },
  {
    id: 'itv-mylnx-62',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How will you change user access or privileges?',
    probing:
      'Whether you apply least privilege through groups, narrow sudoers files and clean revocation.',
    answer: [
      "I start from the approved role and the principle of least privilege — only granting what's actually needed: which systems, which commands, which files, and for how long. I prefer group-based access over one-off permissions for individual users.",
      'For sudo, I create a narrow file under `/etc/sudoers.d/` using `visudo -f`, list the exact commands where practical, and avoid broad passwordless root access. Alternatively, add the user to the `wheel` or `sudo` group.',
      'For data access, I use owner and group permission bits or ACLs (`setfacl`), and confirm with `namei -l` or `getfacl`. I test with `sudo -l -U user` and an actual, non-destructive command, keep an emergency admin session open, and log the ticket and expiry date.',
      '- Add to a group: `usermod -aG docker alice`.\n- Change shell or lock the account: `chsh`, `passwd -l user` to lock it, `usermod -L` or `-U`.\n- Review `/etc/sudoers` regularly.',
      'When access is removed, I revoke the group membership, sudo rule, and key entries, end any active sessions if needed, and check that no alternate way to get that privilege was left open.',
    ],
    tags: ['users', 'sudo', 'permissions'],
  },
  {
    id: 'itv-mylnx-63',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you list the top 10 largest files anywhere on a Linux system?',
    probing:
      'Whether you can build the pipeline, explain each stage and scope it with -xdev to the full filesystem.',
    answer: [
      '`find / -type f` walks files starting from root, `du -h` reports how much disk space each one actually uses in human-readable units, `sort -hr` puts the biggest first, and `head -n 10` keeps the top ten.',
      "Redirecting stderr hides permission errors and noise from `/proc`, but during a formal investigation I might want to see those errors, since a path I couldn't read means the search wasn't actually complete.",
      'Scanning all of `/` can be slow and can wander into NFS, container, backup, or other mounted filesystems. I usually start with `df -hT` to find the full filesystem, and search just that mount with `-xdev`.',
      "For the exact logical size with GNU tools, I can use `find ... -printf '%s\\t%p\\n' | sort -nr`; `du` instead reports allocated blocks, so sparse files can show a different number. Filenames containing newlines need a null-delimited or scripted approach instead.",
      "Once I find a large file, I check it with `stat`, `file`, and `lsof`, and confirm the owner and retention policy. I don't delete it just because it's big.",
    ],
    code: [
      {
        title: 'System-wide top 10',
        language: 'bash',
        code: `sudo find / -type f -exec du -h -- {} + 2>/dev/null | sort -hr | head -n 10`,
      },
      {
        title: 'Scoped to one filesystem',
        language: 'bash',
        code: `sudo find /var -xdev -type f -exec du -h -- {} + 2>/dev/null \\
  | sort -hr | head -n 10`,
      },
    ],
    tags: ['disk', 'find'],
  },
  {
    id: 'itv-mylnx-64',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you find which process is consuming the most memory?',
    probing:
      'Whether you understand RSS versus VSZ, confirm system pressure and capture diagnostics before restarting.',
    answer: [
      'For a quick snapshot I use `ps aux --sort=-%mem | head -n 11`. The first line is the header, so `head -n 11` shows ten actual processes. For real investigation I prefer explicit columns sorted by resident memory.',
      "RSS is the physical memory the process actually has resident right now; VSZ includes virtual mappings and can look large without meaning real memory pressure. `%MEM` is fine for a quick comparison, but a single snapshot doesn't tell you if usage is growing.",
      'I confirm system-wide pressure with `free -h`, `vmstat 1`, swap activity, and OOM evidence from `journalctl -k | grep -i oom`. Then I map the PID to its systemd service, container, or application, and watch it with `pidstat -r -p <pid> 1` or a runtime-specific tool.',
      'Before restarting or killing anything, I capture logs and heap or thread diagnostics where relevant, confirm the actual user impact, and try graceful service control first. The permanent fix might be correcting a memory leak, tuning a cache or heap setting, setting resource limits, scaling traffic, or adding capacity.',
    ],
    code: [
      {
        title: 'Top memory consumers',
        language: 'bash',
        code: `ps aux --sort=-%mem | head -n 11
ps -eo pid,ppid,user,%mem,rss,vsz,etime,cmd --sort=-rss | head -n 11`,
      },
    ],
    tags: ['memory', 'processes'],
  },
  {
    id: 'itv-mylnx-65',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you find the process using the most CPU right now?',
    probing:
      'Whether you confirm a CPU snapshot over time and consider load, steal and I/O wait before acting.',
    answer: [
      'I take a snapshot first, then confirm the pattern holds over time.',
      "I check the load average, CPU steal time, I/O wait, recent deployments, and traffic before acting. High load doesn't necessarily mean the CPU itself is saturated — tasks blocked on I/O can drive load up too.",
      'I capture the PID, its service or container owner, and its logs, then mitigate it safely — scaling, rolling back, rate-limiting, or gracefully restarting whichever workload turns out to actually be the problem.',
    ],
    code: [
      {
        title: 'CPU snapshot and trend',
        language: 'bash',
        code: `ps -eo pid,ppid,user,%cpu,%mem,etime,cmd --sort=-%cpu | head -n 11
top -o %CPU
pidstat -u 1`,
      },
    ],
    tags: ['cpu', 'processes'],
  },
  {
    id: 'itv-mylnx-66',
    level: 'basic',
    kind: 'open',
    prompt: 'What does `chmod 754` set?',
    probing: 'Whether you can decode an octal mode quickly, including directory semantics.',
    answer: [
      "It sets `rwxr-xr--`: the owner can read, write, and execute (7); the group can read and execute (5); everyone else can only read (4). On a directory, execute means being able to enter or access entries inside it, so someone with only read permission can list the names in it but can't actually go into it.",
      "I check the target and its current permissions with `ls -ld`, avoid making sensitive files world-readable, and use groups or ACLs when plain mode bits aren't precise enough.",
    ],
    tags: ['permissions', 'chmod'],
  },
  {
    id: 'itv-mylnx-67',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between `kill -15` and `kill -9`?',
    probing:
      'Whether you know SIGTERM can be handled and SIGKILL cannot, and default to the graceful one.',
    answer: [
      '`kill -15` sends SIGTERM, which an application can catch and handle — stop accepting new work, flush its state, close connections cleanly. `kill -9` sends SIGKILL — the kernel stops the process immediately, and it gets no chance to clean up.',
      'I start with SIGTERM, look into why shutdown is taking too long if it is, and only reach for SIGKILL when the process is genuinely stuck and I understand what an abrupt stop will cost. Neither one should be used carelessly on a database or other critical service.',
    ],
    tags: ['signals', 'processes'],
  },
  {
    id: 'itv-mylnx-68',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you find and stop a process listening on port 8080?',
    probing:
      'Whether you identify the owning service or container before stopping it, so a supervisor does not simply restart it.',
    answer: [
      "I identify which service owns the port before stopping it — killing a bare PID can just get it recreated by a supervisor, and can interrupt users unexpectedly. If no service unit owns it, I use `kill -TERM <pid>`, confirm the listener is actually gone, and only escalate to `KILL` if it doesn't respond.",
      "I also check containers (`docker ps` or `crictl ps`) and firewall or proxy configuration, since a port being reachable doesn't prove the application behind it is healthy.",
    ],
    code: [
      {
        title: 'Find and stop the listener',
        language: 'bash',
        code: `sudo ss -ltnp '( sport = :8080 )'
sudo lsof -nP -iTCP:8080 -sTCP:LISTEN
sudo systemctl stop <service-name>`,
      },
    ],
    tags: ['networking', 'ports', 'processes'],
  },
  {
    id: 'itv-mylnx-69',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A disk is 95% full. How do you find what is consuming space?',
    probing:
      'Whether you scope to the full mount, check open-deleted files and inodes and avoid deleting unknown data.',
    answer: [
      "I first identify the full filesystem with `df -hT`, then look only at that mount so another filesystem doesn't skew the result.",
      'The last command finds deleted-but-open files, a common reason `du` and `df` disagree. I check logs, package caches, container images and volumes, temp files, snapshots, and inode usage (`df -i`).',
      "I preserve the evidence and apply retention, rotation, resizing, or a controlled cleanup — I don't delete unknown production data just to make an alert go away.",
    ],
    code: [
      {
        title: 'Space investigation on /var',
        language: 'bash',
        code: `sudo du -xhd1 /var | sort -h
sudo find /var -xdev -type f -size +500M -printf '%s %p\\n' | sort -nr | head
sudo lsof +L1`,
      },
    ],
    tags: ['disk', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-70',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'How do you troubleshoot high disk usage or a disk-full issue on Linux servers used for CI/CD?',
    probing:
      'Whether you go beyond deleting logs and images to find the real cause and prevent recurrence on build agents.',
    answer: [
      'Short answer: run `du -sh /*` (or `df -h`) to find the big directories, clear `/var/log`, remove old Docker images and containers, archive old build artifacts, and expand the disk if needed.',
      'Detailed interview approach: I start by confirming the scope of the problem and making sure I still have access before I change anything. For disk usage I check `df -hT`, `df -i`, `du -x`, and `lsof +L1` to see whether space or inodes are the issue and whether a deleted file is still held open.',
      "Then I work out what's actually happening: is it real growth, a leak, an open-but-deleted file, unrotated logs, or just heavy I/O? I fix it with the smallest safe action first — reducing traffic, letting a service shut down cleanly, running an approved cleanup or rotation, or adding capacity — and I only act after I've gathered evidence.",
      'Once things are stable, I check that the application is healthy and look at the resource trend over time. Then I add retention rules, limits, and alerts, or fix the underlying code or config, instead of just scheduling blind restarts or deletions.',
    ],
    followUps: [
      'How would you automate Docker image and workspace cleanup on build agents safely?',
      'What alert thresholds would you set, and on what signal?',
    ],
    tags: ['disk', 'ci/cd', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-71',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'How do you investigate a service crash using system logs?',
    probing:
      'Whether you correlate systemd status, the journal and kernel logs with changes in the failure window.',
    answer: [
      "I establish which service, which host, and the exact failure window, then use `systemctl status <service>`, `journalctl -u <service> --since '30 minutes ago'`, and `journalctl -k` for kernel or OOM evidence. I compare the exit code, restart count, and any configuration, deployment, dependency, or resource changes around that time.",
      'If it makes sense, I validate the configuration and try to reproduce it safely in a lower environment. After fixing it with a rollback, a targeted configuration change, or added capacity, I confirm the health checks pass and add an actionable alert or runbook for that failure mode.',
    ],
    tags: ['logs', 'systemd', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-72',
    level: 'intermediate',
    kind: 'open',
    prompt: 'Package manager versus compiling from source: when do you use each?',
    probing: 'Whether you understand the maintenance and supply-chain cost of source builds.',
    answer: [
      "I prefer the supported `apt`, `dnf`, or `yum` package, because it gives dependency management, signed updates, an inventory of what's installed, security patches, and a clean way to remove it later.",
      "I only compile from source when a needed feature or version isn't available in the approved repositories, and whoever owns the system accepts the extra burden of patching it, knowing where the build came from and how it was built, keeping the build reproducible, and being able to roll it back.",
      'For production, I package the build myself or use a trusted repository, rather than leave untracked binaries sitting under `/usr/local`.',
    ],
    tags: ['packages'],
  },
  {
    id: 'itv-mylnx-73',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'The server has high load and an application reports "disk full", but `df -h` shows free space. What do you check?',
    probing:
      'Whether you think of inodes, namespaces, quotas, separate mounts, read-only remounts and I/O wait together.',
    answer: [
      'I check for inode exhaustion with `df -i`, since millions of small files can use up every inode while data blocks are still free.',
      "I also check the actual mount namespace (`findmnt`, or the container's own namespace), quotas, a separate filesystem like `/tmp` that might be full on its own, filesystem errors or remount-read-only messages in `dmesg`, and deleted-but-open files with `lsof +L1`.",
      'High load can also just be I/O wait from a storage problem rather than actual CPU work, so I check `iostat`, `vmstat`, latency and error metrics, and kernel logs. I fix the specific constraint I find, confirm the application can write again and what actually caused it, then set alerts for both bytes and inode usage.',
    ],
    followUps: [
      'How would you check this from inside a container versus on the host?',
      'What does ENOSPC look like when a user quota is hit?',
    ],
    tags: ['disk', 'inodes', 'troubleshooting'],
  },
  {
    id: 'itv-mylnx-74',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk through the Linux boot process from firmware to login.',
    probing: 'Whether you know each boot stage and how to debug a failure at each one.',
    answer: [
      'Firmware — BIOS or UEFI — initializes the hardware and picks a boot device. The bootloader, usually GRUB, loads the chosen kernel and initramfs.',
      'The kernel initializes drivers, mounts the initial root filesystem, and starts PID 1, normally systemd. Systemd then mounts the remaining filesystems, starts services and targets in the right order, and brings up a console or display manager.',
      "If boot fails, I use the bootloader's options, the emergency or rescue target, `journalctl -b`, kernel messages, filesystem checks, and a look at any recent configuration changes.",
      'I keep a known-good kernel and a rescue path available before changing any boot configuration.',
    ],
    followUps: [
      'What is the role of initramfs?',
      'How do you boot into the emergency target from GRUB?',
    ],
    tags: ['boot', 'systemd', 'kernel'],
  },
]
