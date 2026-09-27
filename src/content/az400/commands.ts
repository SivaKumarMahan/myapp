import type { CommandGroup } from '../types'

/**
 * Searchable command reference for AZ-400.
 *
 * Grouped by what you are trying to do: shape Git history, manage large files,
 * drive Azure Repos and Azure Pipelines, publish packages, drive GitHub
 * Actions, wire up keyless authentication to Azure, and ship safely.
 */
export const az400CommandGroups: CommandGroup[] = [
  {
    id: 'az4-cmd-git',
    title: 'Git branching, history and recovery',
    description:
      'Everyday branching, reading history, undoing changes safely and getting lost work back.',
    entries: [
      {
        id: 'az4-c-git-switch-create',
        command: 'git switch -c <branch> <start-point>',
        description: 'Create a branch from a starting point and switch to it.',
        placeholders: ['<branch>', '<start-point>'],
        example: 'git switch -c feature/checkout-retry origin/main',
        notes:
          'Branching from origin/main (after git fetch) avoids starting from a stale local main.',
        tags: ['branching', 'basics'],
      },
      {
        id: 'az4-c-git-log-graph',
        command: 'git log --oneline --graph --decorate --all',
        description: 'Show the commit graph of every branch, compactly.',
        example: 'git log --oneline --graph --decorate --all -n 30',
        tags: ['history', 'inspect'],
      },
      {
        id: 'az4-c-git-rebase',
        command: 'git rebase <upstream>',
        description: 'Replay your branch commits on top of another branch for a linear history.',
        placeholders: ['<upstream>'],
        example: 'git fetch origin && git rebase origin/main',
        notes:
          'Rewrites commit IDs. Only rebase branches nobody else has based work on; push with --force-with-lease afterwards.',
        tags: ['branching', 'history', 'rewrite'],
      },
      {
        id: 'az4-c-git-push-force-lease',
        command: 'git push --force-with-lease origin <branch>',
        description: 'Overwrite a remote branch only if it still points where you last saw it.',
        placeholders: ['<branch>'],
        notes:
          'Safer than --force: refuses if someone else pushed in the meantime. Branch policies usually block it on main.',
        tags: ['push', 'rewrite'],
      },
      {
        id: 'az4-c-git-cherry-pick',
        command: 'git cherry-pick -x <commit>',
        description: 'Apply one commit onto the current branch, recording where it came from.',
        placeholders: ['<commit>'],
        example: 'git switch releases/2.4 && git cherry-pick -x 3f9c2ab',
        notes: 'Typical for back-porting a hotfix from main into a release branch.',
        tags: ['branching', 'hotfix'],
      },
      {
        id: 'az4-c-git-revert',
        command: 'git revert <commit>',
        description: 'Create a new commit that undoes an earlier one, without rewriting history.',
        placeholders: ['<commit>'],
        example: 'git revert -m 1 <merge-commit>',
        notes:
          'The safe way to undo something already pushed to a shared branch. Use -m 1 for merge commits.',
        tags: ['recovery', 'undo'],
      },
      {
        id: 'az4-c-git-reset',
        command: 'git reset --soft|--mixed|--hard <commit>',
        description:
          'Move the current branch to another commit, keeping changes staged, unstaged or discarding them.',
        placeholders: ['<commit>'],
        example: 'git reset --soft HEAD~1',
        notes: '--hard discards uncommitted work. Never reset a pushed shared branch; use revert.',
        tags: ['recovery', 'undo', 'rewrite'],
      },
      {
        id: 'az4-c-git-reflog',
        command: 'git reflog',
        description:
          'List every position HEAD has been at, including commits no longer on any branch.',
        example: 'git reflog -n 20 && git branch rescue HEAD@{3}',
        notes:
          'The way back after a bad reset or rebase. The reflog is local and entries expire over time.',
        tags: ['recovery', 'history'],
      },
      {
        id: 'az4-c-git-tag',
        command: 'git tag -a <tag> -m "<message>" && git push origin <tag>',
        description: 'Create an annotated release tag and push it.',
        placeholders: ['<tag>', '<message>'],
        example: 'git tag -a v2.4.0 -m "Release 2.4.0" && git push origin v2.4.0',
        notes:
          'Tag pushes can trigger pipelines (trigger.tags in Azure Pipelines, on.push.tags in Actions).',
        tags: ['tags', 'release'],
      },
      {
        id: 'az4-c-git-filter-repo',
        command: 'git filter-repo --path <file> --invert-paths',
        description: 'Remove a file (for example a leaked secret) from the entire history.',
        placeholders: ['<file>'],
        example: 'git filter-repo --path config/appsettings.Production.json --invert-paths',
        notes:
          'Rewrites every commit; all clones must re-clone. Rotate the leaked secret first - rewriting history does not un-leak it.',
        tags: ['secrets', 'rewrite', 'recovery'],
      },
    ],
  },
  {
    id: 'az4-cmd-lfs',
    title: 'Git LFS and large repositories',
    description: 'Keep large binaries out of Git objects and keep big repos fast.',
    entries: [
      {
        id: 'az4-c-lfs-install',
        command: 'git lfs install',
        description: 'Set up the Git LFS hooks for your user account (once per machine).',
        tags: ['lfs', 'setup'],
      },
      {
        id: 'az4-c-lfs-track',
        command: 'git lfs track "<pattern>" && git add .gitattributes',
        description:
          'Store files matching a pattern as LFS pointers; commit the .gitattributes change.',
        placeholders: ['<pattern>'],
        example: 'git lfs track "*.psd" "*.mp4" && git add .gitattributes',
        notes: 'Only affects files added from now on. Existing history needs git lfs migrate.',
        tags: ['lfs'],
      },
      {
        id: 'az4-c-lfs-migrate',
        command: 'git lfs migrate import --include="<pattern>" --everything',
        description: 'Rewrite existing history so matching files become LFS objects.',
        placeholders: ['<pattern>'],
        example: 'git lfs migrate import --include="*.zip" --everything',
        notes: 'Rewrites history like filter-repo: coordinate with the team and force-push.',
        tags: ['lfs', 'rewrite'],
      },
      {
        id: 'az4-c-scalar-clone',
        command: 'scalar clone <url>',
        description:
          'Clone a very large repository with partial clone, sparse checkout and background maintenance configured.',
        placeholders: ['<url>'],
        example: 'scalar clone https://dev.azure.com/contoso/_git/monorepo',
        notes:
          'Scalar ships with Git. Use git sparse-checkout set <dirs> to widen what is checked out.',
        tags: ['monorepo', 'performance'],
      },
    ],
  },
  {
    id: 'az4-cmd-repos',
    title: 'Azure DevOps CLI: repos, pull requests and branch policies',
    description:
      'The azure-devops extension (az extension add --name azure-devops). Set defaults once, then manage repos, PRs and policies.',
    entries: [
      {
        id: 'az4-c-devops-configure',
        command:
          'az devops configure --defaults organization=https://dev.azure.com/<org> project=<project>',
        description: 'Set the default organization and project so later commands can omit them.',
        placeholders: ['<org>', '<project>'],
        notes: 'Authenticate with az login, or set AZURE_DEVOPS_EXT_PAT for non-interactive use.',
        tags: ['setup', 'azure-devops'],
      },
      {
        id: 'az4-c-repos-pr-create',
        command:
          'az repos pr create --source-branch <branch> --target-branch main --title "<title>" --work-items <id> --auto-complete true --squash true',
        description:
          'Open a PR linked to a work item, set to squash-merge automatically once policies pass.',
        placeholders: ['<branch>', '<title>', '<id>'],
        example:
          'az repos pr create --source-branch feature/retry --target-branch main --title "Add retry" --work-items 4312 --auto-complete true --squash true',
        tags: ['pull-request', 'repos'],
      },
      {
        id: 'az4-c-repos-pr-list',
        command: 'az repos pr list --status active --target-branch main -o table',
        description: 'List open pull requests into main.',
        tags: ['pull-request', 'inspect'],
      },
      {
        id: 'az4-c-policy-approver-count',
        command:
          'az repos policy approver-count create --repository-id <repo-id> --branch main --minimum-approver-count 2 --creator-vote-counts false --allow-downvotes false --reset-on-source-push true --blocking true --enabled true',
        description:
          'Require two approvals (not counting the author) and reset votes on new pushes.',
        placeholders: ['<repo-id>'],
        tags: ['branch-policy', 'pull-request'],
      },
      {
        id: 'az4-c-policy-build',
        command:
          'az repos policy build create --repository-id <repo-id> --branch main --build-definition-id <pipeline-id> --blocking true --enabled true --queue-on-source-update-only false --manual-queue-only false --display-name "<name>" --valid-duration 720',
        description: 'Add a build validation policy: PRs into main need a passing pipeline run.',
        placeholders: ['<repo-id>', '<pipeline-id>', '<name>'],
        notes:
          'This is how PR builds are triggered for Azure Repos; the YAML pr keyword does not apply.',
        tags: ['branch-policy', 'pipelines', 'quality-gate'],
      },
      {
        id: 'az4-c-policy-work-item',
        command:
          'az repos policy work-item-linking create --repository-id <repo-id> --branch main --blocking true --enabled true',
        description: 'Require every PR into main to be linked to a work item.',
        placeholders: ['<repo-id>'],
        tags: ['branch-policy', 'traceability'],
      },
      {
        id: 'az4-c-policy-merge-strategy',
        command:
          'az repos policy merge-strategy create --repository-id <repo-id> --branch main --allow-squash true --allow-no-fast-forward false --allow-rebase false --allow-rebase-merge false --blocking true --enabled true',
        description: 'Limit how PRs into main may be completed - here, squash merge only.',
        placeholders: ['<repo-id>'],
        tags: ['branch-policy', 'merge'],
      },
      {
        id: 'az4-c-policy-list',
        command: 'az repos policy list --repository-id <repo-id> --branch main -o table',
        description: 'List the branch policies applied to main.',
        placeholders: ['<repo-id>'],
        tags: ['branch-policy', 'inspect'],
      },
    ],
  },
  {
    id: 'az4-cmd-pipelines',
    title: 'Azure Pipelines CLI: runs, variables and variable groups',
    description: 'Create and run YAML pipelines, inspect runs and agents, and manage variables.',
    entries: [
      {
        id: 'az4-c-pipelines-create',
        command:
          'az pipelines create --name <name> --repository <repo> --repository-type tfsgit --branch main --yml-path azure-pipelines.yml',
        description: 'Create a pipeline from a YAML file in an Azure Repos repo.',
        placeholders: ['<name>', '<repo>'],
        notes: 'Use --repository-type github with a GitHub service connection for GitHub repos.',
        tags: ['pipelines', 'setup'],
      },
      {
        id: 'az4-c-pipelines-run',
        command: 'az pipelines run --name <pipeline> --branch <branch>',
        description: 'Queue a run manually on a branch.',
        placeholders: ['<pipeline>', '<branch>'],
        example: 'az pipelines run --name orders-ci --branch main --parameters environment=staging',
        notes:
          '--variables overrides queue-time settable variables; --parameters sets runtime parameters.',
        tags: ['pipelines', 'run'],
      },
      {
        id: 'az4-c-pipelines-runs-list',
        command: 'az pipelines runs list --pipeline-ids <id> --top 10 -o table',
        description:
          'Recent runs with result and reason (manual, individualCI, schedule, pullRequest).',
        placeholders: ['<id>'],
        tags: ['pipelines', 'inspect'],
      },
      {
        id: 'az4-c-pipelines-runs-show',
        command: 'az pipelines runs show --id <run-id> --open',
        description: 'Show a run and open it in the browser.',
        placeholders: ['<run-id>'],
        tags: ['pipelines', 'inspect'],
      },
      {
        id: 'az4-c-pipelines-variable-create',
        command:
          'az pipelines variable create --pipeline-name <pipeline> --name <var> --value <value> --allow-override true',
        description: 'Add a pipeline variable that can be overridden at queue time.',
        placeholders: ['<pipeline>', '<var>', '<value>'],
        notes:
          'Add --secret true for a secret variable; it is then masked and not exposed to fork builds.',
        tags: ['variables'],
      },
      {
        id: 'az4-c-variable-group-create',
        command:
          'az pipelines variable-group create --name <group> --variables <k1>=<v1> <k2>=<v2> --authorize false',
        description: 'Create a variable group shared by pipelines in the project.',
        placeholders: ['<group>', '<k1>', '<v1>', '<k2>', '<v2>'],
        example:
          'az pipelines variable-group create --name app-staging --variables region=westeurope sku=P1v3',
        notes:
          'Reference it in YAML with variables: - group: app-staging. Link it to Key Vault for secrets.',
        tags: ['variables', 'variable-groups'],
      },
      {
        id: 'az4-c-variable-group-secret',
        command:
          'az pipelines variable-group variable create --group-id <id> --name <var> --secret true --value <value>',
        description: 'Add a secret variable to an existing variable group.',
        placeholders: ['<id>', '<var>', '<value>'],
        notes: 'Omit --value to be prompted, so the secret does not land in shell history.',
        tags: ['variables', 'secrets'],
      },
      {
        id: 'az4-c-pipelines-pool-list',
        command: 'az pipelines pool list -o table',
        description: 'List agent pools in the organization.',
        tags: ['agents'],
      },
      {
        id: 'az4-c-pipelines-agent-list',
        command: 'az pipelines agent list --pool-id <pool-id> -o table',
        description: 'List agents in a pool with status.',
        placeholders: ['<pool-id>'],
        notes: 'Add --include-capabilities to compare with job demands.',
        tags: ['agents', 'inspect'],
      },
    ],
  },
  {
    id: 'az4-cmd-artifacts',
    title: 'Azure Artifacts and package publishing',
    description: 'Universal Packages from the CLI, plus the client commands used with feeds.',
    entries: [
      {
        id: 'az4-c-universal-publish',
        command:
          'az artifacts universal publish --scope project --feed <feed> --name <package> --version <semver> --path <dir>',
        description: 'Publish a folder as a Universal Package.',
        placeholders: ['<feed>', '<package>', '<semver>', '<dir>'],
        example:
          'az artifacts universal publish --scope project --feed tools --name ops-cli --version 1.2.0 --path ./dist',
        notes: 'Organization-scoped feeds use --scope organization (the default) and no project.',
        tags: ['artifacts', 'universal', 'publish'],
      },
      {
        id: 'az4-c-universal-download',
        command:
          'az artifacts universal download --scope project --feed <feed> --name <package> --version <version> --path <dir>',
        description: 'Download a Universal Package; the version accepts wildcards such as 1.*.',
        placeholders: ['<feed>', '<package>', '<version>', '<dir>'],
        tags: ['artifacts', 'universal', 'download'],
      },
      {
        id: 'az4-c-nuget-add-source',
        command:
          'dotnet nuget add source https://pkgs.dev.azure.com/<org>/<project>/_packaging/<feed>/nuget/v3/index.json --name <name>',
        description: 'Register an Azure Artifacts feed as a NuGet source.',
        placeholders: ['<org>', '<project>', '<feed>', '<name>'],
        notes: 'Append @Release to the feed name to consume only the Release view.',
        tags: ['artifacts', 'nuget'],
      },
      {
        id: 'az4-c-nuget-push',
        command: 'dotnet nuget push <package.nupkg> --source <name> --api-key az',
        description: 'Push a NuGet package to a feed (the api-key is a required dummy value).',
        placeholders: ['<package.nupkg>', '<name>'],
        notes: '409 Conflict means the version already exists or existed - versions are immutable.',
        tags: ['artifacts', 'nuget', 'publish'],
      },
      {
        id: 'az4-c-npm-publish-ghp',
        command: 'npm publish --registry https://npm.pkg.github.com',
        description: 'Publish a scoped npm package to GitHub Packages.',
        notes: 'In Actions, set NODE_AUTH_TOKEN to GITHUB_TOKEN and grant packages: write.',
        tags: ['github-packages', 'npm', 'publish'],
      },
    ],
  },
  {
    id: 'az4-cmd-gh',
    title: 'GitHub CLI: workflows, runs, secrets and variables',
    description: 'Drive GitHub Actions from the terminal with gh.',
    entries: [
      {
        id: 'az4-c-gh-workflow-run',
        command: 'gh workflow run <workflow> --ref <branch> -f <input>=<value>',
        description: 'Trigger a workflow_dispatch workflow with inputs.',
        placeholders: ['<workflow>', '<branch>', '<input>', '<value>'],
        example: 'gh workflow run deploy.yml --ref main -f environment=staging',
        tags: ['actions', 'run'],
      },
      {
        id: 'az4-c-gh-run-list',
        command: 'gh run list --workflow <workflow> --branch <branch> --limit 10',
        description: 'Recent runs of a workflow with status and trigger event.',
        placeholders: ['<workflow>', '<branch>'],
        tags: ['actions', 'inspect'],
      },
      {
        id: 'az4-c-gh-run-watch',
        command: 'gh run watch <run-id> --exit-status',
        description: 'Follow a run live and exit non-zero if it fails.',
        placeholders: ['<run-id>'],
        tags: ['actions', 'inspect'],
      },
      {
        id: 'az4-c-gh-run-view-failed',
        command: 'gh run view <run-id> --log-failed',
        description: 'Print only the logs of failed steps.',
        placeholders: ['<run-id>'],
        tags: ['actions', 'troubleshooting'],
      },
      {
        id: 'az4-c-gh-run-rerun',
        command: 'gh run rerun <run-id> --failed',
        description: 'Re-run only the failed jobs of a run.',
        placeholders: ['<run-id>'],
        notes: 'Add --debug to enable runner and step debug logging for the re-run.',
        tags: ['actions', 'run'],
      },
      {
        id: 'az4-c-gh-secret-set',
        command:
          'gh secret set <NAME> [--env <environment> | --org <org> --visibility selected --repos <repo>]',
        description:
          'Create or update an Actions secret at repository, environment or organization level.',
        placeholders: ['<NAME>', '<environment>', '<org>', '<repo>'],
        example: 'gh secret set SQL_PASSWORD --env production',
        notes: 'Without --body it prompts, keeping the value out of shell history.',
        tags: ['actions', 'secrets'],
      },
      {
        id: 'az4-c-gh-variable-set',
        command: 'gh variable set <NAME> --body <value> [--env <environment>]',
        description: 'Create or update a plain-text configuration variable (read as vars.NAME).',
        placeholders: ['<NAME>', '<value>', '<environment>'],
        example:
          'gh variable set AZURE_CLIENT_ID --body 00000000-0000-0000-0000-000000000000 --env production',
        tags: ['actions', 'variables'],
      },
      {
        id: 'az4-c-gh-runner-token',
        command:
          'gh api -X POST repos/<owner>/<repo>/actions/runners/registration-token --jq .token',
        description: 'Get a short-lived token to register a self-hosted runner.',
        placeholders: ['<owner>', '<repo>'],
        tags: ['actions', 'runners'],
      },
    ],
  },
  {
    id: 'az4-cmd-oidc',
    title: 'Workload identity federation (OIDC) to Azure',
    description:
      'Create identities that GitHub Actions or Azure Pipelines can use without any stored secret.',
    entries: [
      {
        id: 'az4-c-ad-app-create',
        command: 'az ad app create --display-name <name> && az ad sp create --id <app-id>',
        description: 'Create an app registration and its service principal.',
        placeholders: ['<name>', '<app-id>'],
        tags: ['entra-id', 'identity'],
      },
      {
        id: 'az4-c-ad-app-fic-create',
        command:
          'az ad app federated-credential create --id <app-id> --parameters <credential.json>',
        description: 'Add a federated credential to an app registration.',
        placeholders: ['<app-id>', '<credential.json>'],
        example:
          'az ad app federated-credential create --id <app-id> --parameters \'{"name":"gh-prod","issuer":"https://token.actions.githubusercontent.com","subject":"repo:contoso/web:environment:production","audiences":["api://AzureADTokenExchange"]}\'',
        notes:
          'The subject must exactly match the token: environment, branch (ref:refs/heads/main), tag or pull_request.',
        tags: ['oidc', 'entra-id', 'github-actions'],
      },
      {
        id: 'az4-c-identity-create',
        command: 'az identity create --name <uami> --resource-group <rg>',
        description: 'Create a user-assigned managed identity to use as the deployment identity.',
        placeholders: ['<uami>', '<rg>'],
        tags: ['managed-identity', 'identity'],
      },
      {
        id: 'az4-c-identity-fic-create',
        command:
          'az identity federated-credential create --name <name> --identity-name <uami> --resource-group <rg> --issuer <issuer> --subject <subject> --audiences api://AzureADTokenExchange',
        description: 'Add a federated credential to a user-assigned managed identity.',
        placeholders: ['<name>', '<uami>', '<rg>', '<issuer>', '<subject>'],
        example:
          'az identity federated-credential create --name gh-main --identity-name id-gh-web --resource-group rg-web --issuer https://token.actions.githubusercontent.com --subject repo:contoso/web:ref:refs/heads/main --audiences api://AzureADTokenExchange',
        notes:
          'For Azure Pipelines service connections, use the issuer and subject shown on the service connection.',
        tags: ['oidc', 'managed-identity'],
      },
      {
        id: 'az4-c-identity-fic-list',
        command:
          'az identity federated-credential list --identity-name <uami> --resource-group <rg> -o table',
        description:
          'List the subjects a managed identity trusts - the first check for AADSTS700213.',
        placeholders: ['<uami>', '<rg>'],
        tags: ['oidc', 'troubleshooting'],
      },
      {
        id: 'az4-c-role-assign-rg',
        command:
          'az role assignment create --assignee-object-id <principal-id> --assignee-principal-type ServicePrincipal --role "<role>" --scope <scope>',
        description: 'Grant the deployment identity a role at the narrowest scope that works.',
        placeholders: ['<principal-id>', '<role>', '<scope>'],
        example:
          'az role assignment create --assignee-object-id <principal-id> --assignee-principal-type ServicePrincipal --role "Website Contributor" --scope /subscriptions/<sub>/resourceGroups/rg-web',
        tags: ['rbac', 'least-privilege'],
      },
    ],
  },
  {
    id: 'az4-cmd-deploy',
    title: 'Safe deployment: slots and what-if',
    description: 'Preview infrastructure changes and swap App Service slots for low-risk releases.',
    entries: [
      {
        id: 'az4-c-slot-create',
        command:
          'az webapp deployment slot create --name <app> --resource-group <rg> --slot staging --configuration-source <app>',
        description: 'Create a staging slot that clones the production slot configuration.',
        placeholders: ['<app>', '<rg>'],
        notes: 'Slots need Standard tier or higher.',
        tags: ['app-service', 'slots', 'blue-green'],
      },
      {
        id: 'az4-c-slot-swap',
        command:
          'az webapp deployment slot swap --name <app> --resource-group <rg> --slot staging --target-slot production',
        description: 'Swap staging into production after warm-up (a VIP swap).',
        placeholders: ['<app>', '<rg>'],
        notes: 'Swap back the same way to roll back. Slot-sticky settings stay with their slot.',
        tags: ['app-service', 'slots', 'rollback'],
      },
      {
        id: 'az4-c-slot-preview-swap',
        command:
          'az webapp deployment slot swap --name <app> --resource-group <rg> --slot staging --action preview',
        description:
          'Swap with preview: apply production settings to staging and pause for validation.',
        placeholders: ['<app>', '<rg>'],
        notes: 'Finish with --action swap or cancel with --action reset.',
        tags: ['app-service', 'slots'],
      },
      {
        id: 'az4-c-slot-list',
        command: 'az webapp deployment slot list --name <app> --resource-group <rg> -o table',
        description: 'List the deployment slots of a web app.',
        placeholders: ['<app>', '<rg>'],
        tags: ['app-service', 'slots', 'inspect'],
      },
      {
        id: 'az4-c-deployment-what-if',
        command:
          'az deployment group what-if --resource-group <rg> --template-file <main.bicep> --parameters <params>',
        description: 'Preview what a Bicep or ARM deployment would create, change or delete.',
        placeholders: ['<rg>', '<main.bicep>', '<params>'],
        example:
          'az deployment group what-if -g rg-web -f infra/main.bicep -p infra/prod.bicepparam',
        notes:
          'Run it in PR pipelines so reviewers see the infrastructure diff. Add --result-format ResourceIdOnly for a shorter list.',
        tags: ['bicep', 'what-if', 'iac'],
      },
      {
        id: 'az4-c-deployment-sub-what-if',
        command: 'az deployment sub what-if --location <region> --template-file <main.bicep>',
        description:
          'The same preview for subscription-scope deployments (resource groups, policy, RBAC).',
        placeholders: ['<region>', '<main.bicep>'],
        tags: ['bicep', 'what-if', 'iac'],
      },
    ],
  },
]
