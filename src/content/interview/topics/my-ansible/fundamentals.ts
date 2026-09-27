import type { InterviewQuestion } from '../../../types'

/** Core concepts, ad hoc commands, facts, playbooks, variables, loops, conditions, handlers and debugging (summary.md). */
export const myAnsibleFundamentalsQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myans-12',
    level: 'basic',
    kind: 'open',
    prompt: 'What is Ansible, and what are its core components?',
    probing:
      'The vocabulary: control node, managed node, inventory, module, task, play, playbook, role, collection, and what idempotence means.',
    answer: [
      '**Ansible** is an automation tool for configuration management, application deployment, orchestration, and general operational tasks. It has no agent to install. The control node reads YAML playbooks and inventory, connects to managed nodes over SSH for Linux, and runs modules that return structured results.',
      'The core components are:',
      '- **Control node**: The machine where `ansible-core`, inventories, collections and playbooks are installed.\n- **Managed node**: A target host managed by Ansible. A permanently installed Ansible agent is normally not required.\n- **Inventory**: Hosts, groups and connection/group variables.\n- **Module**: Reusable code that performs one focused operation, such as managing a package, file, user or service.\n- **Task**: One call to a module with arguments.\n- **Play**: Maps an ordered list of tasks/roles to a host pattern.\n- **Playbook**: One or more plays stored as YAML.\n- **Role**: A standard directory structure for reusable tasks, handlers, defaults, variables, templates and files.\n- **Collection**: A distributable package containing modules, plugins, roles and documentation.',
      "Ansible aims for **idempotence**: you can run the same automation again and it won't make unnecessary changes. This depends on picking the right modules and writing the playbook correctly. An arbitrary shell command isn't automatically safe to repeat.",
    ],
    code: [
      {
        title: 'Basic execution flow',
        language: 'text',
        code: `playbook
-> inventory and host-pattern resolution
-> SSH/network connection
-> optional privilege escalation
-> module execution
-> ok/changed/failed/unreachable result
-> handler execution when notified
-> play recap`,
      },
    ],
    tags: ['fundamentals', 'architecture', 'idempotence'],
  },
  {
    id: 'itv-myans-13',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you install Ansible and lay out a new Ansible project?',
    probing:
      'What the control node and managed nodes need, how to verify the install, and a sensible multi-environment project layout.',
    answer: [
      'Install `ansible-core` on the control node using the approved operating-system package or Python environment. Managed nodes normally need:',
      '- Network reachability from the control node.\n- SSH access for the approved remote user.\n- Python when required by the selected modules.\n- Approved `sudo`/privilege-escalation permission for privileged tasks.',
      'Use SSH keys or an enterprise credential mechanism rather than embedding passwords in inventory. Validate host keys; do not globally disable host-key checking merely to make automation connect.',
      "Do not change `sshd_config` to enable password or root login as a default setup shortcut. Use the organization's approved SSH, bastion, identity and privilege-escalation design.",
    ],
    code: [
      {
        title: 'Verify installation',
        language: 'bash',
        code: `ansible --version
ansible-playbook --version
ansible-config dump --only-changed`,
      },
      {
        title: 'Typical project layout',
        language: 'text',
        code: `ansible/
├── ansible.cfg
├── inventories/
│   ├── dev/
│   │   ├── hosts.yml
│   │   ├── group_vars/
│   │   └── host_vars/
│   └── prod/
│       ├── hosts.yml
│       ├── group_vars/
│       └── host_vars/
├── playbooks/
│   └── site.yml
├── roles/
├── collections/
│   └── requirements.yml
└── requirements.yml`,
      },
    ],
    tags: ['setup', 'project layout'],
  },
  {
    id: 'itv-myans-14',
    level: 'basic',
    kind: 'open',
    prompt: 'What are ad hoc commands, and what are the key ad hoc commands you use?',
    probing:
      'When ad hoc is appropriate versus a playbook, and fluency with the common modules for files, packages, services, users and reboots.',
    answer: [
      "An ad hoc command performs a one-time task with the pattern `ansible <host-pattern> -i <inventory> -m <module> -a '<arguments>'`. Use ad hoc commands for investigation or carefully controlled one-time actions. Put repeatable configuration in a playbook under source control.",
      'Use `ansible.builtin.command` when shell features are not required, and `ansible.builtin.shell` only when a command genuinely needs pipes, redirection, variable expansion or another shell feature. Prefer purpose-built modules.',
      'Use the generic package module when the package name and behavior are portable, and the operating-system-specific module (`dnf`, `apt`) when its features are required.',
      '`authorized_key` is in the `ansible.posix` collection, so declare/install the approved collection version.',
      "A fleet-wide reboot is high impact, so don't just reboot `all` casually. Use `--limit`, serial or canary execution, maintenance approval, and a service-health check instead.",
    ],
    code: [
      {
        title: 'Connectivity and information',
        language: 'bash',
        code: `# Verify Ansible connectivity. This is not an ICMP ping.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.ping

# Target one inventory group.
ansible webservers -i inventories/dev/hosts.yml \\
  -m ansible.builtin.ping

# Run a command without a shell.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.command \\
  -a 'uptime'

ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.command \\
  -a 'df -h'

ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.command \\
  -a 'free -m'`,
      },
      {
        title: 'Files and directories',
        language: 'bash',
        code: `# Copy a control-node file to managed nodes.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.copy \\
  -a 'src=/etc/hosts dest=/tmp/hosts mode=0644'

# Create a directory.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.file \\
  -a 'path=/tmp/test_dir state=directory mode=0755'

# Create an empty file.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.file \\
  -a 'path=/tmp/file.txt state=touch mode=0644'

# Remove a file.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.file \\
  -a 'path=/tmp/file.txt state=absent'

# Ensure a line exists.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.lineinfile \\
  -a 'path=/tmp/test.conf line="feature=true" create=true'

# Remove a matching line.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.lineinfile \\
  -a 'path=/tmp/test.conf regexp="^feature=" state=absent'`,
      },
      {
        title: 'Packages and services',
        language: 'bash',
        code: `# Generic package module.
ansible webservers -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.builtin.package \\
  -a 'name=nginx state=present'

# Red Hat-family example.
ansible webservers -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.builtin.dnf \\
  -a 'name=httpd state=present'

# Debian-family example.
ansible webservers -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.builtin.apt \\
  -a 'name=nginx state=present update_cache=true'

# Manage a service declaratively.
ansible webservers -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.builtin.service \\
  -a 'name=nginx state=started enabled=true'

ansible webservers -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.builtin.service \\
  -a 'name=nginx state=stopped'`,
      },
      {
        title: 'Users, SSH keys and reboot',
        language: 'bash',
        code: `# Create a user.
ansible all -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.builtin.user \\
  -a 'name=deploy state=present create_home=true'

# Remove a user. Review data-removal requirements before using remove=true.
ansible all -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.builtin.user \\
  -a 'name=deploy state=absent'

# Add an approved public key to a user.
ansible all -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.posix.authorized_key \\
  -a "user=deploy state=present key=\\"{{ lookup('ansible.builtin.file', '/secure/path/deploy.pub') }}\\""

# Reboot (limit and batch this in real use).
ansible webservers -i inventories/dev/hosts.yml \\
  --become \\
  -m ansible.builtin.reboot`,
      },
    ],
    tags: ['ad hoc', 'commands', 'modules'],
  },
  {
    id: 'itv-myans-15',
    level: 'basic',
    kind: 'open',
    prompt: 'What are Ansible facts, and how do you gather and use them?',
    probing:
      'Default fact gathering, the setup module with filters, common facts and magic variables, and which ones need facts gathered.',
    answer: [
      'Facts are system information gathered from managed nodes. By default, a normal play gathers facts unless `gather_facts: false` is set.',
      "Interface fact names depend on the host's interface names; do not assume every machine uses `eth0`.",
      '`inventory_hostname` is available even when fact gathering is disabled. `ansible_hostname` depends on gathered/cached facts.',
    ],
    code: [
      {
        title: 'Gather facts with the setup module',
        language: 'bash',
        code: `# Gather all available facts.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.setup

# Return selected facts.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.setup \\
  -a 'filter=ansible_os_family'

ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.setup \\
  -a 'filter=ansible_distribution*'

ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.setup \\
  -a 'filter=ansible_*_mb'

ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.setup \\
  -a 'filter=ansible_*'`,
      },
      {
        title: 'Common facts and magic variables',
        language: 'text',
        code: `ansible_facts['os_family']
ansible_facts['distribution']
ansible_facts['distribution_major_version']
ansible_facts['hostname']
ansible_facts['memtotal_mb']
ansible_facts['processor_vcpus']
inventory_hostname
inventory_hostname_short
group_names
groups
hostvars
ansible_play_hosts
ansible_play_batch`,
      },
    ],
    tags: ['facts', 'variables'],
  },
  {
    id: 'itv-myans-16',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What does a valid modern playbook look like, and what are its key parts?',
    probing:
      'Whether you write playbooks with FQCNs, named tasks, desired-state arguments, validated templates and handlers.',
    answer: [
      'A valid modern playbook targets a host group, escalates privilege only where needed, picks OS-specific values from facts, validates templates before installing them and restarts the service through a handler.',
      'Key points of this playbook:',
      '- YAML indentation uses spaces, not tabs.\n- A play targets `hosts`.\n- `become: true` performs approved privilege escalation.\n- Each task has a descriptive name.\n- Fully qualified collection names such as `ansible.builtin.package` make module origin explicit.\n- Module argument values describe desired state.\n- A handler runs only when a notifying task reports `changed`.',
    ],
    code: [
      {
        title: 'Modern playbook',
        language: 'yaml',
        code: `---
- name: Configure web servers
  hosts: webservers
  become: true
  gather_facts: true

  vars:
    web_package_by_os:
      Debian: nginx
      RedHat: httpd

  tasks:
    - name: Select the web package
      ansible.builtin.set_fact:
        web_package: "{{ web_package_by_os[ansible_facts['os_family']] }}"

    - name: Install the web package
      ansible.builtin.package:
        name: "{{ web_package }}"
        state: present

    - name: Deploy web configuration
      ansible.builtin.template:
        src: web.conf.j2
        dest: /etc/web.conf
        owner: root
        group: root
        mode: "0644"
        validate: "/usr/local/bin/validate-web-config %s"
      notify: Restart web service

    - name: Ensure the service is running and enabled
      ansible.builtin.service:
        name: "{{ web_package }}"
        state: started
        enabled: true

  handlers:
    - name: Restart web service
      ansible.builtin.service:
        name: "{{ web_package }}"
        state: restarted`,
      },
    ],
    tags: ['playbooks', 'yaml'],
  },
  {
    id: 'itv-myans-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you run and validate playbooks before making real changes?',
    probing:
      'Syntax check, check and diff mode, listing tasks and tags, and knowing the limits of check mode and `--start-at-task`.',
    answer: [
      "Check mode is a prediction, not a guarantee. Some modules don't support it fully, commands may get skipped or behave differently, and external systems can change between the check and the real run. Validate on a small environment or canary, then verify the real result.",
      '`--start-at-task` is mainly for controlled recovery/debugging. Starting in the middle can skip prerequisites and produce an invalid state.',
    ],
    code: [
      {
        title: 'Run and validate commands',
        language: 'bash',
        code: `# Run with a specific inventory.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml

# Parse and validate playbook syntax.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --syntax-check

# Predict changes where modules support check mode.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --check

# Show supported file/template differences.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --check --diff

# List tasks.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --list-tasks

# List tags.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --list-tags

# Start at an exact task name.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --start-at-task "Install the web package"`,
      },
    ],
    traps: [
      'Treating a clean `--check` run as proof the real run will succeed - it is only a prediction.',
    ],
    tags: ['playbooks', 'check mode', 'validation'],
  },
  {
    id: 'itv-myans-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do tags, `--limit`, `--forks` and `serial` differ?',
    probing:
      'Tags select tasks, limit selects hosts, forks sets parallel host workers, and serial sets rollout batches - and the risks of each.',
    answer: [
      'Tags select tasks; they do not automatically guarantee that prerequisites ran.',
      '`--limit` restricts execution to hosts or a group intersection. Always confirm the resulting host match. A mistyped pattern can match zero or unintended hosts.',
      '`--forks 10` lets up to ten hosts run in parallel — it does not run ten tasks on one host. Pick your concurrency based on control-node capacity, network limits, any rate limits on dependencies, and how fast the service can safely roll out.',
      'For controlled batches, use `serial` in the play, optionally with `max_fail_percentage` to stop the rollout on failure.',
    ],
    code: [
      {
        title: 'Tagged tasks',
        language: 'yaml',
        code: `- name: Install NGINX
  ansible.builtin.package:
    name: nginx
    state: present
  tags:
    - install
    - web

- name: Deploy NGINX configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: "0644"
  notify: Reload NGINX
  tags:
    - configure
    - web`,
      },
      {
        title: 'Tags, limits and forks on the command line',
        language: 'bash',
        code: `# Execute matching tagged tasks.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --tags install

# Skip matching tagged tasks.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --skip-tags configure

# Restrict execution to one host.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --limit web1

# Restrict to a group intersection.
ansible-playbook -i inventories/prod/hosts.yml \\
  playbooks/site.yml --limit 'webservers:&canary'

# Up to ten hosts in parallel.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --forks 10`,
      },
      {
        title: 'Rolling deployment with serial',
        language: 'yaml',
        code: `- name: Rolling web deployment
  hosts: webservers
  serial: 2
  max_fail_percentage: 0
  tasks:
    - name: Deploy application
      ansible.builtin.include_role:
        name: web_application`,
      },
    ],
    tags: ['tags', 'forks', 'serial', 'rollout'],
  },
  {
    id: 'itv-myans-19',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Where can Ansible variables come from, and how do extra vars, registered vars and precedence work?',
    probing:
      'The main variable sources, why extra vars win, the risk of passing secrets with `-e`, and how to inspect resolved values.',
    answer: [
      'Variables describe environment and host differences without duplicating task logic. Sources include:',
      '- Role defaults.\n- Inventory and dynamic inventory.\n- `group_vars` and `host_vars`.\n- Play variables.\n- `vars_files`.\n- Role variables.\n- Facts.\n- Registered task results.\n- `set_fact`.\n- Extra variables (`-e`/`--extra-vars`).',
      'Extra variables have very high precedence. Treat externally supplied values as controlled input and validate them. Do not pass passwords directly on the command line because process listings, shell history and CI logs can expose them.',
      'Registered variables exist for the current playbook run and are host-specific. A registered loop result contains a `results` list.',
      'Variable precedence is detailed and important: when the same variable appears in several places, the higher-precedence source wins. Use `ansible-inventory --host <host>` and targeted debug output to inspect resolved non-secret values.',
    ],
    code: [
      {
        title: 'Static play variables',
        language: 'yaml',
        code: `---
- name: Install required packages
  hosts: webservers
  become: true
  vars:
    required_packages:
      - git
      - maven
      - nginx

  tasks:
    - name: Install packages
      ansible.builtin.package:
        name: "{{ required_packages }}"
        state: present`,
      },
      {
        title: 'Playbook using an extra variable',
        language: 'yaml',
        code: `---
- name: Manage an application user
  hosts: all
  become: true
  tasks:
    - name: Ensure requested user exists
      ansible.builtin.user:
        name: "{{ application_user }}"
        state: present`,
      },
      {
        title: 'Pass an extra variable and inspect resolved host vars',
        language: 'bash',
        code: `ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/user.yml \\
  --extra-vars 'application_user=deploy'

ansible-inventory -i inventories/dev/hosts.yml --host web1`,
      },
      {
        title: 'Registered variable',
        language: 'yaml',
        code: `- name: Read service status
  ansible.builtin.command:
    cmd: systemctl is-active nginx
  register: nginx_status
  changed_when: false
  failed_when: nginx_status.rc not in [0, 3]

- name: Display status
  ansible.builtin.debug:
    var: nginx_status.stdout`,
      },
    ],
    tags: ['variables', 'precedence'],
  },
  {
    id: 'itv-myans-20',
    level: 'basic',
    kind: 'open',
    prompt: 'How do loops work in Ansible playbooks?',
    probing:
      'Modern `loop` syntax, looping over dictionaries, `loop_control` and the `item` variable.',
    answer: [
      'Modern playbooks normally use `loop`, and the current item is referenced as `item`. You can loop over simple lists or over a list of dictionaries and reference fields such as `item.path`.',
      'Use `loop_control` with a `label` for clearer output.',
      'Legacy `with_items` remains recognizable, but `loop` is clearer for new content. The variable is `item`, not `items`.',
    ],
    code: [
      {
        title: 'Loop over a list',
        language: 'yaml',
        code: `- name: Create application users
  ansible.builtin.user:
    name: "{{ item }}"
    state: present
  loop:
    - hardik
    - virat
    - rohit`,
      },
      {
        title: 'Loop over dictionaries',
        language: 'yaml',
        code: `- name: Create application directories
  ansible.builtin.file:
    path: "{{ item.path }}"
    state: directory
    owner: "{{ item.owner }}"
    group: "{{ item.group }}"
    mode: "{{ item.mode }}"
  loop:
    - path: /opt/orders
      owner: orders
      group: orders
      mode: "0750"
    - path: /var/log/orders
      owner: orders
      group: orders
      mode: "0750"`,
      },
      {
        title: 'loop_control label',
        language: 'yaml',
        code: `loop_control:
  label: "{{ item.path }}"`,
      },
    ],
    tags: ['loops', 'playbooks'],
  },
  {
    id: 'itv-myans-21',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do conditions with `when` work in Ansible?',
    probing:
      'Raw Jinja in `when` without outer braces, conditions on facts and registered results, and list-style AND conditions.',
    answer: [
      '`when` controls whether a task runs. It contains a raw Jinja expression and does not use `{{ }}` around the full condition.',
      'You can branch on facts such as `os_family`, on a registered result such as a `stat` check, and give a list of conditions when all of them must be true.',
    ],
    code: [
      {
        title: 'Condition on facts',
        language: 'yaml',
        code: `- name: Install Git on Red Hat-family systems
  ansible.builtin.dnf:
    name: git
    state: present
  when: ansible_facts['os_family'] == "RedHat"

- name: Install Git on Debian-family systems
  ansible.builtin.apt:
    name: git
    state: present
    update_cache: true
  when: ansible_facts['os_family'] == "Debian"`,
      },
      {
        title: 'Condition on a registered result',
        language: 'yaml',
        code: `- name: Check whether configuration exists
  ansible.builtin.stat:
    path: /etc/orders/orders.conf
  register: orders_config

- name: Back up existing configuration
  ansible.builtin.copy:
    src: /etc/orders/orders.conf
    dest: /etc/orders/orders.conf.backup
    remote_src: true
    mode: preserve
  when: orders_config.stat.exists`,
      },
      {
        title: 'Multiple required conditions',
        language: 'yaml',
        code: `when:
  - maintenance_enabled | bool
  - ansible_facts['os_family'] == "Debian"`,
      },
    ],
    traps: ['Wrapping the whole `when` expression in `{{ }}`.'],
    tags: ['conditions', 'jinja'],
  },
  {
    id: 'itv-myans-22',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do handlers work, and when would you use `flush_handlers`?',
    probing:
      'Handlers run only on change, once per play even if notified many times, and `flush_handlers` only when a later task depends on it.',
    answer: [
      'Handlers perform an action only after a notifying task reports a change.',
      'Handlers normally run near the end of the play and only once even if several changed tasks notify the same handler. Use `ansible.builtin.meta: flush_handlers` only when a subsequent task genuinely requires the handler to have run earlier.',
      'A handler should normally react to a configuration or deployed artifact change. Installing a package and naming its handler identically does not clearly express intent.',
    ],
    code: [
      {
        title: 'Template notifying a reload handler',
        language: 'yaml',
        code: `tasks:
  - name: Deploy NGINX configuration
    ansible.builtin.template:
      src: nginx.conf.j2
      dest: /etc/nginx/nginx.conf
      owner: root
      group: root
      mode: "0644"
      validate: "nginx -t -c %s"
    notify: Reload NGINX

handlers:
  - name: Reload NGINX
    ansible.builtin.service:
      name: nginx
      state: reloaded`,
      },
    ],
    tags: ['handlers', 'playbooks'],
  },
  {
    id: 'itv-myans-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you debug Ansible playbooks safely?',
    probing:
      'The debug module, verbosity levels, the risk of leaking secrets in verbose output, and reading the recap rather than colours.',
    answer: [
      'Use `ansible.builtin.debug` with `msg` to display managed-node information, or with `var` (optionally gated by `verbosity`) to display a non-secret variable. Add `-v` or `-vvv` to the run for more detail.',
      "Higher verbosity can reveal connection details, command arguments, and sensitive data. Use it carefully: redact shared logs, and apply `no_log: true` to tasks that handle secrets. `no_log` cuts down output exposure, but it won't fix a secret flow that's badly designed in the first place.",
      'The final recap (`ok changed unreachable failed skipped rescued ignored`) is more reliable than terminal color alone. Colors can be configured and may not render in every terminal or CI log.',
    ],
    code: [
      {
        title: 'Display a message',
        language: 'yaml',
        code: `- name: Display managed-node information
  ansible.builtin.debug:
    msg:
      - "Inventory host: {{ inventory_hostname }}"
      - "Hostname: {{ ansible_facts['hostname'] }}"
      - "OS family: {{ ansible_facts['os_family'] }}"
      - "Memory MB: {{ ansible_facts['memtotal_mb'] }}"
      - "vCPUs: {{ ansible_facts['processor_vcpus'] }}"`,
      },
      {
        title: 'Display a variable',
        language: 'yaml',
        code: `- name: Display non-secret application settings
  ansible.builtin.debug:
    var: application_settings
    verbosity: 1`,
      },
      {
        title: 'Verbosity',
        language: 'bash',
        code: `ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml -v

ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml -vvv`,
      },
    ],
    tags: ['debugging', 'verbosity'],
  },
]
