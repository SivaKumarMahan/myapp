import type { InterviewQuestion } from '../../../types'

/** Cheat sheets for kubectl, Docker, Terraform, Ansible, Argo CD, AWS CLI and TLS. */
export const myCheatsheetsPlatformQuestions: InterviewQuestion[] = [
  {
    id: 'itv-mycheat-1',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key kubectl commands for context and cluster information?',
    probing:
      'Whether you check and switch contexts and namespaces deliberately before touching a cluster.',
    answer: [
      'These are the kubectl commands I keep at hand for contexts and cluster information:',
      '- `kubectl config get-contexts`\n- `kubectl config current-context`\n- `kubectl config use-context <context>`\n- `kubectl config set-context --current --namespace=<namespace>`\n- `kubectl cluster-info`\n- `kubectl version`\n- `kubectl api-resources`\n- `kubectl get nodes -o wide`',
      'Always confirm context and namespace before a change.',
    ],
    code: [
      {
        title: 'Context and cluster',
        language: 'bash',
        code: `kubectl config get-contexts
kubectl config current-context
kubectl config use-context <context>
kubectl config set-context --current --namespace=<namespace>
kubectl cluster-info
kubectl version
kubectl api-resources
kubectl get nodes -o wide`,
      },
    ],
    tags: ['kubectl', 'kubernetes', 'commands'],
  },
  {
    id: 'itv-mycheat-2',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key kubectl commands for namespaces and resources?',
    probing:
      'Whether you can list workloads, networking, storage and config objects quickly across namespaces.',
    answer: [
      'These are the kubectl commands I keep at hand for namespaces and resources:',
      '- `kubectl get namespaces`\n- `kubectl create namespace <namespace>`\n- `kubectl get all -n <namespace>`\n- `kubectl get all --all-namespaces`\n- `kubectl get deploy,rs,ds,sts,job,cronjob -n <namespace>`\n- `kubectl get svc,ingress,endpointslice -n <namespace>`\n- `kubectl get pv`\n- `kubectl get pvc,storageclass -n <namespace>`\n- `kubectl get configmap,secret -n <namespace>`',
    ],
    code: [
      {
        title: 'Namespaces and resources',
        language: 'bash',
        code: `kubectl get namespaces
kubectl create namespace <namespace>
kubectl get all -n <namespace>
kubectl get all --all-namespaces
kubectl get deploy,rs,ds,sts,job,cronjob -n <namespace>
kubectl get svc,ingress,endpointslice -n <namespace>
kubectl get pv
kubectl get pvc,storageclass -n <namespace>
kubectl get configmap,secret -n <namespace>`,
      },
    ],
    tags: ['kubectl', 'kubernetes', 'commands'],
  },
  {
    id: 'itv-mycheat-3',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key kubectl commands for pods and troubleshooting?',
    probing: 'Whether you know describe, current and previous logs, exec, debug, events and top.',
    answer: [
      'These are the kubectl commands I keep at hand for pods and troubleshooting:',
      '- `kubectl get pods -A -o wide`\n- `kubectl describe pod <pod> -n <namespace>`\n- `kubectl logs <pod> -n <namespace> -c <container>`\n- `kubectl logs <pod> -n <namespace> -c <container> --previous`\n- `kubectl exec -it <pod> -n <namespace> -c <container> -- /bin/sh`\n- `kubectl debug -it <pod> -n <namespace> --image=<approved-debug-image>`\n- `kubectl get events -A --sort-by=.metadata.creationTimestamp`\n- `kubectl top pods -A`\n- `kubectl top nodes`',
    ],
    code: [
      {
        title: 'Pods and troubleshooting',
        language: 'bash',
        code: `kubectl get pods -A -o wide
kubectl describe pod <pod> -n <namespace>
kubectl logs <pod> -n <namespace> -c <container>
kubectl logs <pod> -n <namespace> -c <container> --previous
kubectl exec -it <pod> -n <namespace> -c <container> -- /bin/sh
kubectl debug -it <pod> -n <namespace> --image=<approved-debug-image>
kubectl get events -A --sort-by=.metadata.creationTimestamp
kubectl top pods -A
kubectl top nodes`,
      },
    ],
    tags: ['kubectl', 'kubernetes', 'troubleshooting'],
  },
  {
    id: 'itv-mycheat-4',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key kubectl commands for deployments and rollouts?',
    probing:
      'Whether you validate with server-side dry run and diff, watch rollouts and know how to undo one.',
    answer: [
      'These are the kubectl commands I keep at hand for deployments and rollouts:',
      '- `kubectl apply --dry-run=server -f app.yaml`\n- `kubectl diff -f app.yaml`\n- `kubectl apply -f app.yaml`\n- `kubectl get deployment <name> -n <namespace>`\n- `kubectl rollout status deployment/<name> -n <namespace>`\n- `kubectl rollout history deployment/<name> -n <namespace>`\n- `kubectl set image deployment/<name> <container>=<image>@sha256:<digest> -n <namespace>`\n- `kubectl scale deployment/<name> --replicas=<count> -n <namespace>`\n- `kubectl rollout undo deployment/<name> -n <namespace>`',
      'For production, prefer reviewed GitOps/manifests over imperative image changes.',
    ],
    code: [
      {
        title: 'Deployments and rollout',
        language: 'bash',
        code: `kubectl apply --dry-run=server -f app.yaml
kubectl diff -f app.yaml
kubectl apply -f app.yaml
kubectl get deployment <name> -n <namespace>
kubectl rollout status deployment/<name> -n <namespace>
kubectl rollout history deployment/<name> -n <namespace>
kubectl set image deployment/<name> <container>=<image>@sha256:<digest> -n <namespace>
kubectl scale deployment/<name> --replicas=<count> -n <namespace>
kubectl rollout undo deployment/<name> -n <namespace>`,
      },
    ],
    tags: ['kubectl', 'deployments', 'rollout'],
  },
  {
    id: 'itv-mycheat-5',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key kubectl commands for ConfigMaps and Secrets?',
    probing:
      'Whether you generate ConfigMaps and Secrets safely with client dry run and avoid committing secret data.',
    answer: [
      'These are the kubectl commands I keep at hand for ConfigMaps and Secrets:',
      '- `kubectl create configmap <name> --from-file=<path> -n <namespace> --dry-run=client -o yaml`\n- `kubectl create configmap <name> --from-literal=<key>=<value> -n <namespace> --dry-run=client -o yaml`\n- `kubectl describe configmap <name> -n <namespace>`\n- `kubectl create secret generic <name> --from-file=<path> -n <namespace> --dry-run=client -o yaml`\n- `kubectl describe secret <name> -n <namespace>`',
      'Do not commit generated Secret YAML or print secret data. Prefer external secret management.',
    ],
    code: [
      {
        title: 'ConfigMaps and Secrets',
        language: 'bash',
        code: `kubectl create configmap <name> --from-file=<path> -n <namespace> --dry-run=client -o yaml
kubectl create configmap <name> --from-literal=<key>=<value> -n <namespace> --dry-run=client -o yaml
kubectl describe configmap <name> -n <namespace>
kubectl create secret generic <name> --from-file=<path> -n <namespace> --dry-run=client -o yaml
kubectl describe secret <name> -n <namespace>`,
      },
    ],
    tags: ['kubectl', 'configmap', 'secrets'],
  },
  {
    id: 'itv-mycheat-6',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key kubectl commands for autoscaling?',
    probing: 'Whether you can inspect and create an HPA and know what it depends on.',
    answer: [
      'These are the kubectl commands I keep at hand for autoscaling:',
      '- `kubectl get hpa -A`\n- `kubectl describe hpa <name> -n <namespace>`\n- `kubectl autoscale deployment <name> --min=2 --max=10 --cpu-percent=70 -n <namespace>`\n- `kubectl top pods -n <namespace>`\n- `kubectl top nodes`',
      'Validate Metrics Server, resource requests, scaling limits, stabilization, and node capacity.',
    ],
    code: [
      {
        title: 'Autoscaling',
        language: 'bash',
        code: `kubectl get hpa -A
kubectl describe hpa <name> -n <namespace>
kubectl autoscale deployment <name> --min=2 --max=10 --cpu-percent=70 -n <namespace>
kubectl top pods -n <namespace>
kubectl top nodes`,
      },
    ],
    tags: ['kubectl', 'hpa', 'autoscaling'],
  },
  {
    id: 'itv-mycheat-7',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are the key kubectl commands for node maintenance and upgrade inspection?',
    probing:
      'Whether you can cordon, drain and uncordon a node safely and know what drain disrupts.',
    answer: [
      'These are the kubectl commands I keep at hand for node maintenance and upgrades:',
      '- `kubectl version`\n- `kubectl get nodes -o wide`\n- `kubectl cordon <node>`\n- `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data`\n- `kubectl uncordon <node>`\n- `kubectl get pods -A`',
      'Drain can disrupt workloads and delete `emptyDir` data. Review PDBs, state, replicas, and replacement capacity first. Use the supported distribution/provider upgrade procedure; do not copy obsolete screenshot versions.',
    ],
    code: [
      {
        title: 'Node maintenance',
        language: 'bash',
        code: `kubectl version
kubectl get nodes -o wide
kubectl cordon <node>
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
kubectl uncordon <node>
kubectl get pods -A`,
      },
    ],
    followUps: [
      'What stops a drain from completing, and how do you handle it?',
      'How do PodDisruptionBudgets interact with a drain?',
    ],
    tags: ['kubectl', 'nodes', 'upgrades'],
  },
  {
    id: 'itv-mycheat-8',
    level: 'advanced',
    kind: 'scenario',
    prompt: 'How do you route common Kubernetes issues to the right kubectl checks?',
    probing:
      'Whether you have a fast, ordered check list for CrashLoopBackOff, ImagePullBackOff, Pending, 503, NotReady and PVC issues.',
    answer: [
      'My quick routing from symptom to the checks I run, in order:',
      '- **CrashLoopBackOff** → describe → current/previous logs → config/probe/resource/dependency\n- **ImagePullBackOff** → Events → image/digest → registry auth/network/CA → node disk\n- **Pending** → scheduler Events → resources/taints/affinity/quota/PVC/autoscaler\n- **503** → ingress/LB → Service → EndpointSlice → readiness → Pod/dependency\n- **NodeNotReady** → Conditions → kubelet/runtime → pressure/CNI/cert/API path\n- **PVC Pending** → PVC/PV/StorageClass → CSI Events/logs → topology/quota/identity',
      'I follow each chain left to right and stop at the first layer that explains the failure.',
    ],
    code: [
      {
        title: 'Quick issue routing',
        language: 'text',
        code: `CrashLoopBackOff → describe → current/previous logs → config/probe/resource/dependency
ImagePullBackOff → Events → image/digest → registry auth/network/CA → node disk
Pending → scheduler Events → resources/taints/affinity/quota/PVC/autoscaler
503 → ingress/LB → Service → EndpointSlice → readiness → Pod/dependency
NodeNotReady → Conditions → kubelet/runtime → pressure/CNI/cert/API path
PVC Pending → PVC/PV/StorageClass → CSI Events/logs → topology/quota/identity`,
      },
    ],
    followUps: [
      'What does the previous-container log tell you in a CrashLoopBackOff?',
      'Which events explain a Pending pod?',
    ],
    tags: ['kubectl', 'kubernetes', 'troubleshooting'],
  },
  {
    id: 'itv-mycheat-9',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Docker commands for images?',
    probing:
      'Whether you know the image lifecycle commands and why production runs images by digest.',
    answer: [
      'These are the Docker commands I keep at hand for images:',
      '- `docker images`: List all images\n- `docker pull <image>`: Pull an image from Docker Hub\n- `docker build -t <name>:<tag> .`: Build image from Dockerfile in current directory\n- `docker build -f <file> .`: Build image from a specific Dockerfile\n- `docker tag <image> <new-image>`: Create a tag for an image\n- `docker rmi <image>`: Remove an image\n- `docker image prune`: Remove unused images\n- `docker image inspect <image>`: Display detailed information about an image\n- `docker history <image>`: Show the history of an image\n- `docker save <image> > <file.tar>`: Save an image to a tar archive',
      'In production, prefer pulling and running images by their fixed digest (`<image>@sha256:<digest>`) rather than a mutable tag — a digest always points to the exact same content. Check what you have and back it up before pruning, and never run "remove everything" commands on production hosts.',
    ],
    code: [
      {
        title: 'Images',
        language: 'bash',
        code: `docker images                     # List all images
docker pull <image>               # Pull an image from Docker Hub
docker build -t <name>:<tag> .    # Build image from Dockerfile in current directory
docker build -f <file> .          # Build image from a specific Dockerfile
docker tag <image> <new-image>    # Create a tag for an image
docker rmi <image>                # Remove an image
docker image prune                # Remove unused images
docker image inspect <image>      # Display detailed information about an image
docker history <image>            # Show the history of an image
docker save <image> > <file.tar>  # Save an image to a tar archive`,
      },
    ],
    tags: ['docker', 'images', 'commands'],
  },
  {
    id: 'itv-mycheat-10',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Docker commands for containers?',
    probing: 'Whether you can run, map ports and volumes, and manage the container lifecycle.',
    answer: [
      'These are the Docker commands I keep at hand for containers:',
      '- `docker ps`: List running containers\n- `docker ps -a`: List all containers (running and stopped)\n- `docker run <image>`: Run a container from an image\n- `docker run -d <image>`: Run container in detached mode\n- `docker run -p <host:container> <image> # Run container with port mapping`\n- `docker run -v <host:container> <image> # Run container with a volume mounted`\n- `docker start <container>`: Start a stopped container\n- `docker stop <container>`: Stop a running container\n- `docker restart <container>`: Restart a container\n- `docker rm <container>`: Remove a container\n- `docker system df`: Show Docker disk usage',
    ],
    code: [
      {
        title: 'Containers',
        language: 'bash',
        code: `docker ps                              # List running containers
docker ps -a                           # List all containers (running and stopped)
docker run <image>                     # Run a container from an image
docker run -d <image>                  # Run container in detached mode
docker run -p <host:container> <image> # Run container with port mapping
docker run -v <host:container> <image> # Run container with a volume mounted
docker start <container>               # Start a stopped container
docker stop <container>                # Stop a running container
docker restart <container>             # Restart a container
docker rm <container>                  # Remove a container
docker system df                       # Show Docker disk usage`,
      },
    ],
    tags: ['docker', 'containers', 'commands'],
  },
  {
    id: 'itv-mycheat-11',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Docker commands for interacting with running containers?',
    probing:
      'Whether you know logs, exec, cp, inspect and stats, and why `exec` is safer than `attach`.',
    answer: [
      'These are the Docker commands I keep at hand for working with running containers:',
      '- `docker logs <container>`: Fetch the logs of a container\n- `docker logs -f <container>`: Follow log output of a container\n- `docker exec -it <container> <command>`: Execute a command in a running container\n- `docker exec -it <container> bash`: Get a bash shell in a running container\n- `docker attach <container>`: Attach to a running container\n- `docker cp <container>:<src> <dest>`: Copy files from container to host\n- `docker cp <src> <container>:<dest>`: Copy files from host to container\n- `docker inspect <container>`: Display detailed info about a container\n- `docker stats`: Live stream of container resource usage\n- `docker top <container>`: Display the running processes of a container',
      'Use `docker exec` for normal investigation; `docker attach` connects to PID 1 and can accidentally signal it. Minimal images may only have `/bin/sh`, not `bash`.',
    ],
    code: [
      {
        title: 'Container interaction',
        language: 'bash',
        code: `docker logs <container>                  # Fetch the logs of a container
docker logs -f <container>               # Follow log output of a container
docker exec -it <container> <command>    # Execute a command in a running container
docker exec -it <container> bash         # Get a bash shell in a running container
docker attach <container>                # Attach to a running container
docker cp <container>:<src> <dest>       # Copy files from container to host
docker cp <src> <container>:<dest>       # Copy files from host to container
docker inspect <container>               # Display detailed info about a container
docker stats                             # Live stream of container resource usage
docker top <container>                   # Display the running processes of a container`,
      },
    ],
    tags: ['docker', 'troubleshooting', 'commands'],
  },
  {
    id: 'itv-mycheat-12',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Docker commands for networks?',
    probing: 'Whether you can create and inspect networks and connect containers by name.',
    answer: [
      'These are the Docker commands I keep at hand for networks:',
      '- `docker network ls`: List all networks\n- `docker network create <name>`: Create a network\n- `docker network rm <name>`: Remove a network\n- `docker network inspect <name>`: Display detailed information about a network\n- `docker network connect <network> <container>`: Connect a container to a network\n- `docker network disconnect <network> <container>`: Disconnect a container from a network',
      'On a user-defined network, containers reach each other by service/container name (e.g. `mysql:<port>`), not a fixed container IP.',
    ],
    code: [
      {
        title: 'Networks',
        language: 'bash',
        code: `docker network ls                                # List all networks
docker network create <name>                     # Create a network
docker network rm <name>                         # Remove a network
docker network inspect <name>                    # Display detailed information about a network
docker network connect <network> <container>     # Connect a container to a network
docker network disconnect <network> <container>  # Disconnect a container from a network`,
      },
    ],
    tags: ['docker', 'networking', 'commands'],
  },
  {
    id: 'itv-mycheat-13',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Docker commands for volumes?',
    probing: 'Whether you can manage volumes and understand that pruning removes data.',
    answer: [
      'These are the Docker commands I keep at hand for volumes:',
      '- `docker volume ls`: List all volumes\n- `docker volume create <name>`: Create a volume\n- `docker volume rm <name>`: Remove a volume\n- `docker volume inspect <name>`: Display detailed information about a volume\n- `docker volume prune`: Remove all unused volumes',
    ],
    code: [
      {
        title: 'Volumes',
        language: 'bash',
        code: `docker volume ls               # List all volumes
docker volume create <name>    # Create a volume
docker volume rm <name>        # Remove a volume
docker volume inspect <name>   # Display detailed information about a volume
docker volume prune            # Remove all unused volumes`,
      },
    ],
    tags: ['docker', 'volumes', 'commands'],
  },
  {
    id: 'itv-mycheat-14',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Docker Compose commands?',
    probing:
      'Whether you can bring a Compose project up and down, know what `down` removes and keep secrets out of YAML.',
    answer: [
      'These are the Docker Compose commands I keep at hand for multi-container projects:',
      '- `docker-compose up`: Create and start containers defined in docker-compose.yml\n- `docker-compose up -d`: Create and start in detached mode\n- `docker-compose down`: Stop and remove containers and networks (add -v for volumes, --rmi for images)\n- `docker-compose ps`: List containers in the Compose project\n- `docker-compose logs`: View output from containers\n- `docker-compose build`: Build or rebuild services',
      'Do not place database passwords directly in Compose YAML; use an approved secret mechanism and protect `.env` files from Git. (Docker Compose v2 uses `docker compose` with a space; v1 uses `docker-compose`.)',
    ],
    code: [
      {
        title: 'Compose',
        language: 'bash',
        code: `docker-compose up          # Create and start containers defined in docker-compose.yml
docker-compose up -d       # Create and start in detached mode
docker-compose down        # Stop and remove containers and networks (add -v for volumes, --rmi for images)
docker-compose ps          # List containers in the Compose project
docker-compose logs        # View output from containers
docker-compose build       # Build or rebuild services`,
      },
    ],
    tags: ['docker', 'compose', 'commands'],
  },
  {
    id: 'itv-mycheat-15',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Terraform commands for a safe workflow?',
    probing: 'Whether you run fmt, validate and a saved plan and apply exactly what was reviewed.',
    answer: [
      'These are the Terraform commands I keep at hand for a safe plan-and-apply workflow:',
      '- `terraform version`\n- `terraform fmt -check -recursive`\n- `terraform init`\n- `terraform validate`\n- `terraform plan -out=tfplan`\n- `terraform show tfplan`\n- `terraform apply tfplan`\n- `terraform output`',
      'Use a reviewed saved plan tied to the same commit. Validate the actual service after apply.',
    ],
    code: [
      {
        title: 'Safe workflow',
        language: 'bash',
        code: `terraform version
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -out=tfplan
terraform show tfplan
terraform apply tfplan
terraform output`,
      },
    ],
    tags: ['terraform', 'commands', 'workflow'],
  },
  {
    id: 'itv-mycheat-16',
    level: 'advanced',
    kind: 'open',
    prompt: 'What are the key Terraform commands for state and import?',
    probing:
      'Whether you can inspect, back up, import and move state safely and know `-replace` supersedes `taint`.',
    answer: [
      'These are the Terraform commands I keep at hand for state and import:',
      "- `terraform state list`\n- `terraform state show '<address>'`\n- `terraform state pull > state-backup.json`\n- `terraform import '<address>' '<provider-id>'`\n- `terraform state mv '<old-address>' '<new-address>'`\n- `terraform plan -refresh-only`",
      'State can contain secrets. Store backups securely and confirm the exact backend/workspace before state operations.',
      "Avoid manual JSON editing. `terraform taint` is deprecated for most workflows; prefer `terraform apply -replace='<address>'` after reviewing the full plan.",
    ],
    code: [
      {
        title: 'State and import',
        language: 'bash',
        code: `terraform state list
terraform state show '<address>'
terraform state pull > state-backup.json
terraform import '<address>' '<provider-id>'
terraform state mv '<old-address>' '<new-address>'
terraform plan -refresh-only`,
      },
    ],
    followUps: [
      'When would you use a `moved` block instead of `terraform state mv`?',
      'What does `plan -refresh-only` show you?',
    ],
    tags: ['terraform', 'state', 'import'],
  },
  {
    id: 'itv-mycheat-17',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Terraform commands for workspaces?',
    probing:
      'Whether you can use workspaces and explain why separate root modules are often a better production boundary.',
    answer: [
      'These are the Terraform commands I keep at hand for workspaces:',
      '- `terraform workspace list`\n- `terraform workspace show`\n- `terraform workspace new <name>`\n- `terraform workspace select <name>`',
      'Workspaces are not always the right production boundary; separate root modules/state often give clearer identities and scope of impact.',
    ],
    code: [
      {
        title: 'Workspaces',
        language: 'bash',
        code: `terraform workspace list
terraform workspace show
terraform workspace new <name>
terraform workspace select <name>`,
      },
    ],
    tags: ['terraform', 'workspaces'],
  },
  {
    id: 'itv-mycheat-18',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Terraform commands for inspection and CI checks?',
    probing:
      'Whether you know providers, graph, console, JSON plans and the meaning of the detailed exit codes.',
    answer: [
      'These are the Terraform commands I keep at hand for inspection:',
      '- `terraform providers`\n- `terraform graph`\n- `terraform console`\n- `terraform show -json tfplan`\n- `terraform plan -detailed-exitcode`',
      'Detailed exit codes are 0=no differences, 1=error, and 2=changes.',
    ],
    code: [
      {
        title: 'Useful inspection',
        language: 'bash',
        code: `terraform providers
terraform graph
terraform console
terraform show -json tfplan
terraform plan -detailed-exitcode`,
      },
    ],
    tags: ['terraform', 'commands', 'ci/cd'],
  },
  {
    id: 'itv-mycheat-19',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How do you use a nested map variable with `for_each` in Terraform?',
    probing:
      'Whether you can type a map of objects and create one resource per key with `each.value`.',
    answer: [
      'The variable is a `map(object({ name, location, tier }))`, and `for_each = var.items` creates one storage account per map key.',
      'Inside the resource, `each.value.name`, `each.value.location` and `each.value.tier` read the fields of the current entry.',
    ],
    code: [
      {
        title: 'Nested map with for_each',
        language: 'hcl',
        code: `variable "items" {
  type = map(object({
    name     = string
    location = string
    tier     = string
  }))
}

resource "azurerm_storage_account" "this" {
  for_each                 = var.items
  name                     = each.value.name
  location                 = each.value.location
  account_tier             = each.value.tier
  resource_group_name      = var.resource_group_name
  account_replication_type = "LRS"
}`,
      },
    ],
    tags: ['terraform', 'for_each', 'variables'],
  },
  {
    id: 'itv-mycheat-20',
    level: 'basic',
    kind: 'open',
    prompt: 'What does a Terraform module skeleton look like?',
    probing: 'Whether you know the standard root layout and how modules are organized under it.',
    answer: [
      'My standard layout keeps root files for providers, versions, variables and outputs, with reusable modules underneath:',
      'Pin provider/module versions, document inputs/outputs, test modules, and keep environment orchestration at the root.',
    ],
    code: [
      {
        title: 'Module skeleton',
        language: 'text',
        code: `root/
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── versions.tf
└── modules/
    ├── network/
    ├── compute/
    └── database/`,
      },
    ],
    tags: ['terraform', 'modules'],
  },
  {
    id: 'itv-mycheat-21',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Ansible commands for inventory and connectivity?',
    probing:
      'Whether you can check the inventory graph and connectivity, and know Ansible ping is not ICMP.',
    answer: [
      'These are the Ansible commands I keep at hand for inventory and connectivity:',
      "- `ansible-inventory -i inventory.yml --graph`\n- `ansible all -i inventory.yml -m ping`\n- `ansible all -i inventory.yml -m setup -a 'filter=ansible_distribution*'`\n- `ansible all -i inventory.yml -a 'uptime'`",
      'Ansible `ping` verifies SSH, Python/module execution, and response; it is not ICMP.',
    ],
    code: [
      {
        title: 'Inventory and connectivity',
        language: 'bash',
        code: `ansible-inventory -i inventory.yml --graph
ansible all -i inventory.yml -m ping
ansible all -i inventory.yml -m setup -a 'filter=ansible_distribution*'
ansible all -i inventory.yml -a 'uptime'`,
      },
    ],
    tags: ['ansible', 'commands'],
  },
  {
    id: 'itv-mycheat-22',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key Ansible commands for running playbooks safely?',
    probing:
      'Whether you syntax-check, dry-run with diff and canary a playbook before the full run.',
    answer: [
      'These are the Ansible commands I keep at hand for running playbooks safely, in this order:',
      '- `ansible-playbook -i inventory.yml site.yml --syntax-check`\n- `ansible-playbook -i inventory.yml site.yml --check --diff`\n- `ansible-playbook -i inventory.yml site.yml --limit <canary-host>`\n- `ansible-playbook -i inventory.yml site.yml`',
    ],
    code: [
      {
        title: 'Playbooks',
        language: 'bash',
        code: `ansible-playbook -i inventory.yml site.yml --syntax-check
ansible-playbook -i inventory.yml site.yml --check --diff
ansible-playbook -i inventory.yml site.yml --limit <canary-host>
ansible-playbook -i inventory.yml site.yml`,
      },
    ],
    tags: ['ansible', 'playbooks'],
  },
  {
    id: 'itv-mycheat-23',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Ansible Vault commands?',
    probing:
      'Whether you can create, edit, encrypt and decrypt vault files and keep the vault password out of the command line.',
    answer: [
      'These are the Ansible Vault commands I keep at hand for secrets:',
      '- `ansible-vault create group_vars/prod/vault.yml`\n- `ansible-vault edit group_vars/prod/vault.yml`\n- `ansible-vault encrypt <file>`\n- `ansible-vault decrypt <file>`',
      'Use an approved password/identity source; never pass a Vault password on the command line or commit it.',
    ],
    code: [
      {
        title: 'Vault',
        language: 'bash',
        code: `ansible-vault create group_vars/prod/vault.yml
ansible-vault edit group_vars/prod/vault.yml
ansible-vault encrypt <file>
ansible-vault decrypt <file>`,
      },
    ],
    tags: ['ansible', 'vault', 'secrets'],
  },
  {
    id: 'itv-mycheat-24',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What does a minimal safe Ansible play look like?',
    probing:
      'Whether you use modules instead of shell, `serial` for gradual rollout and verify health afterward.',
    answer: [
      'A minimal play installs and enables Nginx one host at a time (`serial: 1`) with privilege escalation (`become: true`):',
      'Prefer modules to shell, validate in a canary, and verify application health after the play.',
    ],
    code: [
      {
        title: 'Minimal safe play',
        language: 'yaml',
        code: `- name: Configure web servers
  hosts: webservers
  become: true
  serial: 1
  tasks:
    - name: Install Nginx
      ansible.builtin.package:
        name: nginx
        state: present
    - name: Validate and enable Nginx
      ansible.builtin.service:
        name: nginx
        enabled: true
        state: started`,
      },
    ],
    tags: ['ansible', 'playbooks'],
  },
  {
    id: 'itv-mycheat-25',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key Argo CD CLI commands for applications?',
    probing:
      'Whether you can inspect, diff, sync, wait on and roll back an application, and prefer a Git revert.',
    answer: [
      'These are the Argo CD commands I keep at hand for applications and repositories:',
      '- `argocd login <server> --sso`\n- `argocd app list`\n- `argocd app get <app>`\n- `argocd app diff <app>`\n- `argocd app sync <app>`\n- `argocd app wait <app> --health --sync`\n- `argocd app history <app>`\n- `argocd app rollback <app> <history-id>`\n- `argocd app delete <app>`\n- `argocd repo list`\n- `argocd repo add <repo-url> --ssh-private-key-path <protected-key-path>`',
      'Prefer a reviewed Git revert for auditable rollback and validate application health afterward. Manual sync/rollback should not create long-term divergence from Git.',
    ],
    code: [
      {
        title: 'Applications',
        language: 'bash',
        code: `argocd login <server> --sso
argocd app list
argocd app get <app>
argocd app diff <app>
argocd app sync <app>
argocd app wait <app> --health --sync
argocd app history <app>
argocd app rollback <app> <history-id>
argocd app delete <app>
argocd repo list
argocd repo add <repo-url> --ssh-private-key-path <protected-key-path>`,
      },
    ],
    tags: ['argo cd', 'gitops', 'commands'],
  },
  {
    id: 'itv-mycheat-26',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What does an Argo CD Application manifest look like, and what should you watch out for?',
    probing:
      'Whether you can read an Application spec and understand the risk of automated prune and self-heal.',
    answer: [
      'An Application points at a repo path and a destination namespace, with automated sync:',
      'Prune can delete live objects removed from Git. Protect repositories, projects, sync windows, critical resources, and production changes.',
      '**Installation reminder**',
      'Use the current official installation manifest or Helm chart pinned to an approved version, not an unpinned `stable` URL copied from a screenshot. Configure TLS, SSO/RBAC, repository credentials, backups, network policy, and external access before production use.',
    ],
    code: [
      {
        title: 'Example Application',
        language: 'yaml',
        code: `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments
  namespace: argocd
spec:
  project: payments
  source:
    repoURL: ssh://git@example/release-config.git
    targetRevision: main
    path: apps/payments
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true`,
      },
    ],
    tags: ['argo cd', 'gitops'],
  },
  {
    id: 'itv-mycheat-27',
    level: 'basic',
    kind: 'open',
    prompt: 'What are the key AWS CLI commands for identity, S3, EC2, ECS and EKS?',
    probing:
      'Whether you confirm your identity first and prefer short-lived credentials over long-lived keys.',
    answer: [
      'These are the AWS CLI commands I keep at hand for day-to-day inspection:',
      '- `aws sts get-caller-identity`\n- `aws configure list`\n- `aws s3 ls`\n- `aws s3 cp <file> s3://<bucket>/<key>`\n- `aws s3 cp s3://<bucket>/<key> <file>`\n- `aws ec2 describe-instances --filters Name=instance-state-name,Values=running`\n- `aws ec2 describe-instance-status --include-all-instances`\n- `aws ecs list-clusters`\n- `aws ecs list-services --cluster <cluster>`\n- `aws ecs describe-services --cluster <cluster> --services <service>`\n- `aws eks describe-cluster --name <cluster>`\n- `aws eks update-kubeconfig --name <cluster> --role-arn <approved-role-arn>`',
      'Prefer SSO or short-lived role credentials over `aws configure` with long-lived access keys.',
      'Launching, stopping, terminating, or changing resources is intentionally omitted from the quick list because account, region, network, identity, tags, encryption, protection, and approval must be resolved first. Use reviewed IaC for repeatable infrastructure.',
    ],
    code: [
      {
        title: 'AWS CLI quick list',
        language: 'bash',
        code: `aws sts get-caller-identity
aws configure list

aws s3 ls
aws s3 cp <file> s3://<bucket>/<key>
aws s3 cp s3://<bucket>/<key> <file>

aws ec2 describe-instances \\
  --filters Name=instance-state-name,Values=running
aws ec2 describe-instance-status --include-all-instances

aws ecs list-clusters
aws ecs list-services --cluster <cluster>
aws ecs describe-services --cluster <cluster> --services <service>

aws eks describe-cluster --name <cluster>
aws eks update-kubeconfig --name <cluster> --role-arn <approved-role-arn>`,
      },
    ],
    tags: ['aws', 'aws cli', 'commands'],
  },
  {
    id: 'itv-mycheat-28',
    level: 'intermediate',
    kind: 'open',
    prompt: 'What are the key OpenSSL commands for inspecting a served TLS certificate?',
    probing:
      'Whether you can see the certificate actually served with SNI and read its SAN, issuer and dates.',
    answer: [
      'These are the OpenSSL commands I keep at hand for inspecting the certificate an endpoint serves:',
      '- `openssl s_client -connect <domain>:443 -servername <domain> -showcerts </dev/null`\n- `openssl s_client -connect <domain>:443 -servername <domain> </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -serial -dates -ext subjectAltName`',
      'Check the actual edge/load-balancer endpoint, hostname/SNI, SAN, expiry, issuer, and complete chain.',
    ],
    code: [
      {
        title: 'Inspect the served certificate',
        language: 'bash',
        code: `openssl s_client -connect <domain>:443 -servername <domain> -showcerts </dev/null
openssl s_client -connect <domain>:443 -servername <domain> </dev/null 2>/dev/null \\
  | openssl x509 -noout -subject -issuer -serial -dates -ext subjectAltName`,
      },
    ],
    tags: ['tls', 'openssl', 'certificates'],
  },
  {
    id: 'itv-mycheat-29',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'What are the key commands for renewing certificates with Certbot and reloading the web server?',
    probing: 'Whether you dry-run renewal, validate the web server config and reload gracefully.',
    answer: [
      'These are the Certbot and web-server commands I keep at hand for certificate renewal:',
      '- `certbot certificates`\n- `certbot renew --dry-run`\n- `certbot renew`\n- `nginx -t`\n- `systemctl reload nginx`\n- `apachectl configtest`\n- `systemctl reload apache2`',
      'Do not renew/restart blindly. Inspect renewal logs and challenge reachability, back up configuration, confirm active certificate paths, prefer graceful reload, and retest externally. Use the service name appropriate to the distribution.',
    ],
    code: [
      {
        title: 'Certbot and web server',
        language: 'bash',
        code: `certbot certificates
certbot renew --dry-run
certbot renew
nginx -t
systemctl reload nginx
apachectl configtest
systemctl reload apache2`,
      },
    ],
    tags: ['tls', 'certbot', 'nginx'],
  },
]
