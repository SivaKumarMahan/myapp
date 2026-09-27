import type { InterviewQuestion } from '../../../types'

/** The learner's own Ansible interview questions (questions.md), with notes.md merged in. */
export const myAnsibleQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myans-1',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How have you used Ansible? Give a real example.',
    probing:
      'Whether you have actually run Ansible in anger: inventory, modules over shell, templates, handlers, validation and batched rollout.',
    answer: [
      'I use Ansible for repeatable server setup, patching, user management, application deployment, and configuring services. Ansible has no agent to install — the control node connects to Linux machines over SSH and runs modules remotely.',
      'A practical example is setting up Nginx on several application servers. My flow is:',
      '1. Keep server addresses and groups in an inventory.\n2. Test access with `ansible all -m ping`.\n3. Install Nginx with the package module.\n4. Build the configuration from a Jinja2 template.\n5. Check that the Nginx configuration is valid before reloading it.\n6. Use a handler so Nginx only reloads when its configuration actually changes.',
      'I run `ansible-playbook --check --diff` in a lower environment first, then deploy in small batches using `serial`. Afterward I check the play recap, service status, configuration test, health endpoint, and monitoring.',
      'Running the same playbook again should report no unnecessary changes. That\'s what "idempotent" means, and it\'s a property I design every playbook around.',
    ],
    code: [
      {
        title: 'Nginx playbook with template validation and handler',
        language: 'yaml',
        code: `---
- name: Configure web servers
  hosts: web
  become: true
  serial: 2

  tasks:
    - name: Install Nginx
      ansible.builtin.package:
        name: nginx
        state: present

    - name: Install Nginx configuration
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: "0644"
        validate: "nginx -t -c %s"
      notify: Reload Nginx

    - name: Ensure Nginx is running
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

  handlers:
    - name: Reload Nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded`,
      },
    ],
    tags: ['playbooks', 'nginx', 'idempotence'],
  },
  {
    id: 'itv-myans-2',
    level: 'basic',
    kind: 'open',
    prompt: 'How do you configure an Ansible agent?',
    probing:
      'A trick question: they want you to say Ansible is agentless and then describe the control-node and managed-host setup properly.',
    answer: [
      "Ansible normally doesn't need an agent on managed Linux servers. It connects over SSH, and most modules just need Python on the target. The machine where Ansible itself runs is called the control node.",
      'My setup steps, in order, are:',
      '1. Install Ansible on the control node.\n2. Create a dedicated automation user on managed hosts.\n3. Set up SSH key authentication and verify host keys.\n4. Give that user only the `sudo` privileges it actually needs.\n5. Add hosts and variables to inventory.\n6. Test connectivity and facts before running a real playbook.',
      "If `ping` fails, I add `-vvvv` and check DNS/IP reachability, port 22, SSH keys, host-key verification, the username, whether Python is available, and sudo permissions. On Windows, Ansible usually connects over WinRM or SSH instead, so the setup looks different, but there's still no permanently installed Ansible agent.",
    ],
    code: [
      {
        title: 'Inventory with group connection variables',
        language: 'text',
        code: `[web]
web01 ansible_host=10.0.1.10
web02 ansible_host=10.0.1.11

[web:vars]
ansible_user=automation
ansible_ssh_private_key_file=/secure/path/automation_key
ansible_become=true`,
      },
      {
        title: 'Verify inventory, connectivity and facts',
        language: 'bash',
        code: `ansible-inventory --graph
ansible web -m ping
ansible web -m setup -a 'filter=ansible_distribution*'`,
      },
    ],
    tags: ['agentless', 'setup', 'ssh'],
  },
  {
    id: 'itv-myans-3',
    level: 'advanced',
    kind: 'open',
    prompt: 'How do you manage secrets securely in Ansible?',
    probing:
      'Whether you understand Vault versus an external secret manager, log exposure, least privilege and what to do when a secret leaks.',
    answer: [
      'I never store plaintext passwords, private keys, or API tokens in playbooks, inventory, or Git. For smaller setups I encrypt variables with Ansible Vault.',
      'In enterprise environments I prefer pulling secrets at runtime from Vault, Azure Key Vault, AWS Secrets Manager, or another approved secret store.',
      'My other security habits: a separate vault identity per environment, giving accounts only the access they need, protecting CI credentials, encrypting traffic, rotating secrets, and locking down permissions on the destination file.',
      "`no_log: true` cuts down accidental output, but I don't apply it everywhere by default — it can also hide information I need when troubleshooting.",
      "After a deployment I check that the application can authenticate, that unauthorized users can't read the secret file, that CI logs contain no secret values, and that rotation works without hand-editing the playbook.",
      'If a secret does leak, I revoke or rotate it first, then remove it from Git history and logs, and find out who accessed it.',
    ],
    code: [
      {
        title: 'Vault commands',
        language: 'bash',
        code: `ansible-vault create group_vars/prod/vault.yml
ansible-vault encrypt_string '<db-password>' --name 'db_password'
ansible-playbook site.yml --vault-id prod@prompt`,
        placeholders: ['<db-password>'],
      },
      {
        title: 'Template a secret without exposing it in output',
        language: 'yaml',
        code: `- name: Configure database password without exposing it in output
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    owner: root
    group: myapp
    mode: "0640"
  no_log: true`,
      },
    ],
    followUps: [
      'How would you fetch a secret from Azure Key Vault at runtime instead of storing it in Vault?',
      'How do you supply the vault password to a CI pipeline without exposing it?',
    ],
    tags: ['secrets', 'vault', 'security'],
  },
  {
    id: 'itv-myans-4',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How does Ansible communicate with remote Linux servers, and how do you establish connectivity?',
    probing:
      'The agentless push model over SSH, what `ping` really tests, and a methodical way to get and debug access.',
    answer: [
      'Ansible has no agent. The control node connects to managed Linux hosts over SSH, sends a small module payload, runs it with the selected Python interpreter, and gets back a structured result.',
      'Inventory defines host addresses and variables. `remote_user`, SSH settings, and `become` control login and privilege escalation.',
      'I create or use an approved automation account, check DNS, routes, the firewall, and SSH host keys, install its public key, grant only the sudo commands it needs, and test with the commands below.',
      "Ansible's `ping` doesn't use ICMP — it checks login, Python/module execution, and the response. I troubleshoot with `ssh -vvv` and `ansible -vvv`, then check inventory precedence, proxy or bastion settings, the interpreter, sudo, and file permissions.",
      'Credentials stay in an approved vault or CI identity, never in plaintext inventory.',
    ],
    code: [
      {
        title: 'Connectivity checks',
        language: 'bash',
        code: `ansible-inventory --graph
ansible all -m ping
ansible all -m setup -a 'filter=ansible_distribution*'`,
      },
    ],
    tags: ['ssh', 'connectivity', 'agentless'],
  },
  {
    id: 'itv-myans-5',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'How do you configure passwordless SSH for Ansible, and where should the key be generated?',
    probing:
      'Whether you know the private key stays with the automation identity, only the public key is distributed, and how to harden it.',
    answer: [
      "I generate the key pair on whatever starts the automation — an engineer's approved workstation for personal admin work, or, better, a dedicated CI/control-node identity for shared automation.",
      "The private key stays there or in a credential manager. Only the public key goes into the target user's `~/.ssh/authorized_keys`.",
      'I use restrictive file permissions, verify host keys, protect the private key with a passphrase or managed agent, scope down accounts and sudo, rotate keys, and keep environments separate. "Passwordless" just means public-key authentication — it isn\'t the same as no authentication at all.',
      'In cloud environments I prefer short-lived certificates, SSM, or a managed identity mechanism when the platform supports it.',
    ],
    code: [
      {
        title: 'Generate, distribute and test a key',
        language: 'bash',
        code: `ssh-keygen -t ed25519 -f ~/.ssh/ansible_prod
ssh-copy-id -i ~/.ssh/ansible_prod.pub automation@server
ssh -i ~/.ssh/ansible_prod automation@server`,
      },
    ],
    tags: ['ssh', 'keys', 'security'],
  },
  {
    id: 'itv-myans-6',
    level: 'advanced',
    kind: 'scenario',
    prompt:
      'What if the target Ansible user does not exist or you do not yet have access to the server?',
    probing:
      'Whether you respect access controls and fix the bootstrap process instead of hacking around missing access.',
    answer: [
      "Ansible can't create its own first login path — it needs an already-authorized bootstrap mechanism. I don't bypass access controls or guess at another account.",
      'Instead, I ask the server owner, the cloud-init/image process, the identity-management team, or an approved break-glass administrator to create the automation user, install the public key, register host keys, and grant narrowly scoped sudo.',
      'For repeatability, the base image or provisioning workflow should bootstrap that account. After that, Ansible can manage it going forward.',
      "If access unexpectedly fails, I check ownership, approval, the inventory address, DNS, routing, the firewall, the bastion, the SSH service, whether the account is locked or expired, `authorized_keys` permissions, and any host-key changes, using console or provider access where I'm authorized to.",
      'I record who approved the bootstrap access, and I test both what should work and what should be denied. Missing access is a process gap to escalate, not a reason to loosen SSH policy.',
    ],
    followUps: [
      'How would you bake the automation user into a base image or cloud-init?',
      'What does a break-glass access process look like and how is it audited?',
    ],
    tags: ['access', 'bootstrap', 'ssh'],
  },
  {
    id: 'itv-myans-7',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How would you automate Machine B from Machine A with Ansible?',
    probing:
      'The control-node prerequisites, an idempotent module-based playbook, and a safe first run with validation and a canary.',
    answer: [
      "Machine A needs to be an approved control node: Ansible installed, inventory in place, code checked out, and a valid identity for reaching Machine B. After confirming connectivity, I write an idempotent playbook — one that's safe to run more than once — using modules instead of a chain of shell commands.",
      'I run `ansible-playbook --syntax-check`, then `--check --diff` where the modules support it, limit the first production run to a single canary host, and check service health afterward. Code, inventory structure, Vault references, reviews, and CI logs give me repeatability and an audit trail.',
    ],
    code: [
      {
        title: 'Playbook for Machine B',
        language: 'yaml',
        code: `- hosts: machine_b
  become: true
  tasks:
    - name: Install Nginx
      ansible.builtin.package:
        name: nginx
        state: present
    - name: Ensure Nginx is enabled and running
      ansible.builtin.service:
        name: nginx
        enabled: true
        state: started`,
      },
    ],
    tags: ['control node', 'playbooks'],
  },
  {
    id: 'itv-myans-8',
    level: 'basic',
    kind: 'open',
    prompt: 'Is Ansible inventory static or dynamic?',
    probing:
      'Whether you know both inventory styles, when each fits, and how to inspect what Ansible actually parsed.',
    answer: [
      'It can be either. A static inventory lists hosts and groups in INI or YAML, and works well for small, stable environments.',
      'A dynamic inventory plugin queries a source such as AWS, Azure, VMware, or Kubernetes at run time, and can group hosts by tags, region, or other metadata. I use dynamic inventory for cloud fleets that scale up and down, cache it appropriately, and check it with `ansible-inventory --graph` before making a change.',
      'Inventory should describe targets only — it should never contain secrets.',
      'Always inspect the matched hosts before a high-impact operation. A host pattern such as `all` can affect every node in the selected inventory.',
      'For Azure environments, the `azure.azcollection.azure_rm` inventory plugin can discover Azure virtual machines dynamically. Production automation should declare collection versions in a requirements file rather than installing an unpinned dependency interactively.',
    ],
    code: [
      {
        title: 'INI inventory',
        language: 'text',
        code: `[webservers]
web1 ansible_host=10.20.1.11
web2 ansible_host=10.20.1.12

[databases]
db1 ansible_host=10.20.2.11

[production:children]
webservers
databases

[all:vars]
ansible_user=automation`,
      },
      {
        title: 'YAML inventory',
        language: 'yaml',
        code: `all:
  children:
    webservers:
      hosts:
        web1:
          ansible_host: 10.20.1.11
        web2:
          ansible_host: 10.20.1.12
    databases:
      hosts:
        db1:
          ansible_host: 10.20.2.11
  vars:
    ansible_user: automation`,
      },
      {
        title: 'Inventory inspection',
        language: 'bash',
        code: `# Display parsed inventory as JSON.
ansible-inventory -i inventories/dev/hosts.yml --list

# Display the group/host hierarchy.
ansible-inventory -i inventories/dev/hosts.yml --graph

# Display variables resolved for one host.
ansible-inventory -i inventories/dev/hosts.yml --host web1

# Show hosts matched by a playbook without executing tasks.
ansible-playbook -i inventories/dev/hosts.yml \\
  playbooks/site.yml --list-hosts`,
      },
      {
        title: 'Install the Azure collection for the azure_rm inventory plugin',
        language: 'bash',
        code: `ansible-galaxy collection install azure.azcollection`,
      },
    ],
    tags: ['inventory', 'dynamic inventory'],
  },
  {
    id: 'itv-myans-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What is the difference between the `command` and `shell` modules?',
    probing:
      'Whether you default to the safer `command` module, know what shell features need `shell`, and prefer purpose-built modules.',
    answer: [
      "`ansible.builtin.command` runs a program directly, without a shell interpreting it. That means pipes, redirects, glob expansion, and variables don't work. It's the safer default because it avoids shell injection.",
      '`ansible.builtin.shell` runs through a shell, so use it only when you genuinely need shell features such as pipes, redirection or variable expansion. Shell input must be trusted and quoted carefully.',
      "Given the choice, I prefer a dedicated Ansible module over either one. Where I can, I use `creates`/`removes` or a module that's already idempotent, and I quote any variables carefully when `shell` really is unavoidable.",
    ],
    code: [
      {
        title: 'command versus shell ad hoc',
        language: 'bash',
        code: `# Run a command without a shell.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.command \\
  -a 'uptime'

# Shell only when shell features are needed.
ansible all -i inventories/dev/hosts.yml \\
  -m ansible.builtin.shell \\
  -a 'printf "Hello from %s\\n" "$(hostname)"'`,
      },
    ],
    tags: ['modules', 'shell', 'security'],
  },
  {
    id: 'itv-myans-10',
    level: 'basic',
    kind: 'open',
    prompt: 'What is an Ansible module?',
    probing:
      'The module/task/playbook relationship, structured return values, idempotence and fully qualified collection names.',
    answer: [
      'A module is a reusable unit that Ansible runs to perform one action, for example `package`, `service`, `copy`, `user`, `template`, or a cloud-specific module.',
      'Modules return structured facts like `changed`, `failed`, and their output. A well-written module is idempotent: applying the same desired state repeatedly produces the same result without extra changes.',
      "A task calls one module. A playbook organizes plays, variables, handlers, and tasks together. I use fully qualified names such as `ansible.builtin.copy` so it's always clear where a module comes from.",
    ],
    code: [
      {
        title: 'Read module documentation',
        language: 'bash',
        code: `ansible-doc ansible.builtin.copy
ansible-doc ansible.posix.authorized_key`,
      },
    ],
    tags: ['modules', 'fqcn'],
  },
  {
    id: 'itv-myans-11',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you automate private VMs with Ansible when their IP addresses change?',
    probing:
      'Dynamic inventory keyed on trusted metadata, plus the realisation that discovery does not give you a network path or credentials.',
    answer: [
      "I use a dynamic inventory plugin for the cloud or virtualization platform, and group hosts by metadata I trust, such as environment, application, and role. Ansible asks the provider's API for the current private addresses or hostnames, so nobody has to maintain a static inventory by hand.",
      'A dynamic inventory plugin can ask a cloud provider, virtualization system, CMDB, or other source for the current list of hosts. This is useful for cloud VMs, since their private IP addresses often change.',
      "Internal DNS, a CMDB-backed inventory, a bastion/proxy, or an automation runner inside the private network can provide the connection path where direct access isn't available.",
      "Dynamic inventory only discovers hosts — it doesn't skip normal connection rules. The control node still needs working SSH or WinRM access, a firewall path that's actually open, valid authentication, correct host keys, and credentials scoped to only what it needs.",
    ],
    followUps: [
      'How would you configure the azure_rm inventory plugin to group VMs by tag?',
      'How do you run Ansible through a bastion host?',
    ],
    tags: ['dynamic inventory', 'cloud', 'networking'],
  },
]
