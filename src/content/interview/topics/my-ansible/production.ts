import type { InterviewQuestion } from '../../../types'

/** Vault, roles, Galaxy, lookups, ansible.cfg, production safety and troubleshooting (summary.md, notes.md). */
export const myAnsibleProductionQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myans-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Ansible Vault commands, and what are its limitations?',
    probing:
      'Day-to-day Vault usage plus the understanding that Vault only protects data at rest and decrypted values still need care.',
    answer: [
      'Ansible Vault encrypts variables and files at rest. You create, edit, view, encrypt, decrypt and rekey files, or encrypt a single value to embed in a variable file, and supply the vault password at run time with `--ask-vault-pass` or a `--vault-id` per identity.',
      'Important limitations:',
      '- Vault protects data **at rest**, not while decrypted in memory or passed to a module.\n- Do not commit a vault password file beside encrypted content.\n- Do not print decrypted values through `debug`.\n- Use `no_log: true` on tasks that might return a secret.\n- Restrict who can obtain each vault identity/password.\n- Prefer an approved external secret manager such as Azure Key Vault for centrally managed runtime secrets when appropriate.',
    ],
    code: [
      {
        title: 'Vault file commands',
        language: 'bash',
        code: `# Create a new encrypted file.
ansible-vault create secret.yml

# Edit without leaving a deliberately decrypted copy.
ansible-vault edit secret.yml

# View encrypted content.
ansible-vault view secret.yml

# Encrypt an existing file.
ansible-vault encrypt vars.yml

# Decrypt a file. Use only through an approved process.
ansible-vault decrypt vars.yml

# Change the vault password.
ansible-vault rekey secret.yml

# Encrypt one value for embedding in a variable file.
ansible-vault encrypt_string --name database_password`,
      },
      {
        title: 'Run with a vault password',
        language: 'bash',
        code: `# Prompt for the vault password.
ansible-playbook -i inventories/prod/hosts.yml \\
  playbooks/site.yml \\
  --ask-vault-pass

# Multiple vault identities.
ansible-playbook -i inventories/prod/hosts.yml \\
  playbooks/site.yml \\
  --vault-id prod@prompt`,
      },
    ],
    tags: ['vault', 'secrets'],
  },
  {
    id: 'itv-myans-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is an Ansible role, and how is it structured?',
    probing:
      'The standard role layout, defaults versus vars precedence, and keeping roles focused, testable and versioned.',
    answer: [
      'Roles organize reusable content. You scaffold one with `ansible-galaxy role init` and call it from a play under `roles:`.',
      '- `defaults/`: Low-precedence defaults intended for callers to override.\n- `vars/`: Higher-precedence role variables; use sparingly.\n- `tasks/`: Main role tasks.\n- `handlers/`: Handlers notified by role tasks.\n- `templates/`: Jinja2 templates.\n- `files/`: Static files.\n- `meta/`: Role metadata and dependencies.',
      'Roles reduce duplication but should remain focused, documented, testable and versioned.',
    ],
    code: [
      {
        title: 'Create a role',
        language: 'bash',
        code: `ansible-galaxy role init roles/webserver`,
      },
      {
        title: 'Standard role structure',
        language: 'text',
        code: `roles/webserver/
├── defaults/main.yml
├── files/
├── handlers/main.yml
├── meta/main.yml
├── tasks/main.yml
├── templates/
├── tests/
└── vars/main.yml`,
      },
      {
        title: 'Role task and a play that uses the role',
        language: 'yaml',
        code: `# roles/webserver/tasks/main.yml
- name: Install web package
  ansible.builtin.package:
    name: "{{ webserver_package }}"
    state: present

# playbook
---
- name: Configure web servers
  hosts: webservers
  become: true
  roles:
    - role: webserver`,
      },
    ],
    tags: ['roles', 'reuse'],
  },
  {
    id: 'itv-myans-26',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What is Ansible Galaxy, and how do you use roles and collections from it safely?',
    probing:
      'Installing and pinning roles and collections via requirements files, and vetting community content before trusting it.',
    answer: [
      "Ansible Galaxy distributes reusable roles and collections. Only install content you've reviewed, and pin the version. Record the versions you depend on in `requirements.yml`.",
      "Before using a community role or collection, check its source, license, maintainer trust, version compatibility and how well it's maintained, and check how it handles secrets. A community role should never get unrestricted production credentials.",
      'Pin versions and test updates rather than downloading arbitrary latest content during a Production run.',
    ],
    code: [
      {
        title: 'Galaxy commands',
        language: 'bash',
        code: `# Search for roles.
ansible-galaxy role search nginx

# Show role details.
ansible-galaxy role info <namespace>.<role>

# Install a role.
ansible-galaxy role install <namespace>.<role>

# List installed roles.
ansible-galaxy role list

# Install a collection.
ansible-galaxy collection install <namespace.collection>

# List installed collections.
ansible-galaxy collection list`,
        placeholders: ['<namespace>', '<role>', '<namespace.collection>'],
      },
      {
        title: 'collections/requirements.yml',
        language: 'yaml',
        code: `# collections/requirements.yml
---
collections:
  - name: azure.azcollection
    version: "<approved-version>"`,
        placeholders: ['<approved-version>'],
      },
      {
        title: 'Install from the requirements file',
        language: 'bash',
        code: `ansible-galaxy collection install \\
  --requirements-file collections/requirements.yml`,
      },
    ],
    tags: ['galaxy', 'collections', 'supply chain'],
  },
  {
    id: 'itv-myans-27',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are lookups in Ansible, and how do `lookup` and `query` differ?',
    probing:
      'That lookups run on the control node, the lookup/query return-type difference, and handling secret lookups safely.',
    answer: [
      'Lookups retrieve data on the **control node** from files, environment variables, secret systems or other sources. `lookup(...)` usually returns one value/string; `query(...)` returns a list, which is useful for loops.',
      "Don't use `debug` on a secret lookup result. For Azure Key Vault or another external secret provider, use the approved collection or plugin, an identity with only the access it needs, and `no_log`. Never copy the secret into inventory or source control.",
    ],
    code: [
      {
        title: 'Read a control-node file with a lookup',
        language: 'yaml',
        code: `vars:
  welcome_text: "{{ lookup('ansible.builtin.file', playbook_dir + '/files/welcome.txt') }}"

tasks:
  - name: Display welcome text
    ansible.builtin.debug:
      msg: "Welcome: {{ welcome_text }}"`,
      },
    ],
    tags: ['lookups', 'secrets'],
  },
  {
    id: 'itv-myans-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What goes in `ansible.cfg`, and how do you check which configuration is active?',
    probing:
      'A sensible project-level config, awareness of config precedence surprises, and what must never go in the file.',
    answer: [
      'A project-level `ansible.cfg` sets defaults such as the inventory, remote user, forks, role and collection paths and the Python interpreter. Configuration precedence and file discovery can cause surprises, so inspect the active values.',
      'Do not place private keys, passwords or vault passwords directly in `ansible.cfg`. Do not set `host_key_checking = False` globally without a reviewed risk decision.',
    ],
    code: [
      {
        title: 'Example ansible.cfg',
        language: 'text',
        code: `[defaults]
inventory = ./inventories/dev/hosts.yml
remote_user = automation
forks = 10
roles_path = ./roles
collections_path = ./collections
retry_files_enabled = False
interpreter_python = auto_silent

[privilege_escalation]
become = False`,
      },
      {
        title: 'Inspect active configuration',
        language: 'bash',
        code: `ansible-config view
ansible-config dump --only-changed
ansible --version`,
      },
    ],
    tags: ['configuration', 'ansible.cfg'],
  },
  {
    id: 'itv-myans-29',
    level: 'advanced',
    kind: 'open',
    prompt:
      'What safety and production practices do you follow before and during a Production Ansible run?',
    probing:
      'A senior change process: review, pinning, linting, host inspection, check/diff, canary, batching, monitoring and security hygiene.',
    answer: [
      'Before a Production run:',
      '1. Review the pull request and exact commit.\n2. Pin and install approved collection/role dependencies.\n3. Run linting and `--syntax-check`.\n4. Inspect inventory with `--graph` and `--list-hosts`.\n5. Run check/diff mode where meaningful.\n6. Limit execution to a canary.\n7. Execute in controlled batches using `serial`.\n8. Monitor failure threshold and application health.\n9. Continue only when the canary is healthy.\n10. Preserve the run result and change evidence.',
      'Security practices I follow:',
      '- Use dedicated automation identities.\n- Use SSH agent, managed identity or the approved credential provider.\n- Restrict and audit `sudo`.\n- Validate SSH host keys.\n- Keep secrets out of inventory, Git and logs.\n- Use Ansible Vault or Azure Key Vault as appropriate.\n- Set secure owner/group/mode on managed files.\n- Review third-party collections and roles.\n- Use `no_log` for secret-bearing results.\n- Separate Development and Production inventory and credentials.',
      'Production work should be reviewed, pinned, limited, batched, monitored and recoverable.',
    ],
    code: [
      {
        title: 'Validation commands',
        language: 'bash',
        code: `ansible-lint

ansible-playbook -i inventories/prod/hosts.yml \\
  playbooks/site.yml --syntax-check

ansible-playbook -i inventories/prod/hosts.yml \\
  playbooks/site.yml --list-hosts

ansible-playbook -i inventories/prod/hosts.yml \\
  playbooks/site.yml \\
  --check --diff \\
  --limit canary`,
      },
    ],
    followUps: [
      'How would you wire these checks into a CI/CD pipeline with an approval gate?',
      'How would you roll back if the canary batch fails health checks?',
    ],
    tags: ['production', 'safety', 'ci/cd'],
  },
  {
    id: 'itv-myans-30',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A host is reported as UNREACHABLE by Ansible. How do you troubleshoot it?',
    probing:
      'A layered connectivity checklist from inventory values through DNS, network, bastion, keys and host keys to sshd.',
    answer: [
      'First reproduce with verbose output from Ansible and then test plain SSH with the same user and resolved host, so you can tell an Ansible problem from an SSH problem.',
      'Investigate inventory address/user/port, DNS, route, NSG/firewall, bastion/proxy, private-key permissions, host-key mismatch and SSH service.',
    ],
    code: [
      {
        title: 'Unreachable host checks',
        language: 'bash',
        code: `ansible web1 -i inventories/dev/hosts.yml \\
  -m ansible.builtin.ping -vvv

ssh -vv automation@<resolved-host>`,
        placeholders: ['<resolved-host>'],
      },
    ],
    tags: ['troubleshooting', 'ssh', 'connectivity'],
  },
  {
    id: 'itv-myans-31',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A task fails with permission denied or a become failure. What do you check?',
    probing:
      'Whether you debug identity and sudo policy methodically instead of granting blanket root access.',
    answer: [
      'Check the following, in order:',
      '- Correct remote user.\n- SSH key/identity.\n- `become: true` or `--become` only where required.\n- `sudo` policy for the automation user.\n- Whether a password prompt is expected.\n- File ownership and SELinux/AppArmor policy.',
      'Do not fix the problem by giving unrestricted passwordless root access without review.',
    ],
    traps: ['Granting unrestricted passwordless root to make the error go away.'],
    tags: ['troubleshooting', 'become', 'sudo'],
  },
  {
    id: 'itv-myans-32',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A module fails when the playbook runs. How do you troubleshoot a module failure?',
    probing:
      'Checking FQCN and collection install, module docs, interpreter, argument types and OS compatibility.',
    answer: [
      'Check the following, in order:',
      '- Fully qualified module name and collection installation.\n- Module documentation (`ansible-doc`).\n- Required Python/interpreter on the managed node.\n- Argument types and YAML indentation.\n- Operating-system compatibility.\n- Module return fields with appropriate verbosity.',
    ],
    code: [
      {
        title: 'Module documentation',
        language: 'bash',
        code: `ansible-doc ansible.builtin.copy
ansible-doc ansible.posix.authorized_key`,
      },
    ],
    tags: ['troubleshooting', 'modules'],
  },
  {
    id: 'itv-myans-33',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'A playbook run changed the wrong hosts in production. What do you do?',
    probing:
      'Incident handling: stop safely, preserve evidence, assess and restore, then prevent recurrence with inventory and targeting controls.',
    answer: [
      "Stop the run if it's safe to do so, and preserve evidence. Then check the inventory source and host pattern, and assess or restore the affected configuration.",
      'To prevent this, use separate inventories, `--list-hosts`, `--limit`, and require approval for broad patterns.',
    ],
    followUps: [
      'How would you determine exactly which hosts and files were changed?',
      'What guard rails in CI would stop a broad host pattern from reaching production?',
    ],
    tags: ['troubleshooting', 'incident', 'inventory'],
  },
  {
    id: 'itv-myans-34',
    level: 'intermediate',
    kind: 'scenario',
    prompt: 'A task always reports changed on every run. How do you fix it?',
    probing:
      'Idempotence in practice: replacing commands with modules or declaring accurate change and failure conditions.',
    answer: [
      'Prefer an idempotent module. If a command is unavoidable, set accurate `changed_when`, `failed_when`, `creates`, or `removes` behavior, and verify the real desired state.',
      'For example, a read-only status check should use `changed_when: false` so it never reports a change, with `failed_when` describing which return codes are real failures.',
    ],
    code: [
      {
        title: 'Read-only command that never reports changed',
        language: 'yaml',
        code: `- name: Read service status
  ansible.builtin.command:
    cmd: systemctl is-active nginx
  register: nginx_status
  changed_when: false
  failed_when: nginx_status.rc not in [0, 3]`,
      },
    ],
    tags: ['troubleshooting', 'idempotence'],
  },
]
