import type { InterviewQuestion } from '../../../types'

/** Claude automated PR review via a shared reusable GitHub Actions workflow. */
export const myAiCodeReviewQuestions: InterviewQuestion[] = [
  {
    id: 'itv-myai-78',
    level: 'advanced',
    kind: 'open',
    prompt: 'Walk me through the automated Claude code review setup you built for pull requests.',
    probing:
      'Whether you can explain a reusable, config-driven CI design and the least-privilege boundary on the AI reviewer.',
    answer: [
      '**One-line pitch:** every time someone opens a pull request in one of our ~28 repositories, an AI (Claude) automatically reads the code changes and leaves review comments directly on the PR — checking for bugs, security issues, hardcoded secrets, and bad practices — before a human ever looks at it.',
      "**Interview soundbite:** \"We didn't want to hand-write a review workflow per repo, so we built one reusable GitHub Actions workflow in a central `cicd-workflows` repo. Every app repo just calls it on every PR, passing its own name. That shared workflow assembles a review prompt out of a common base instructions file plus optional per-repo 'role' modules — like an AWS security reviewer persona for infra repos, or a Python reviewer persona for pipeline repos — then hands that prompt to Claude Code via the official `claude-code-action`, scoped so it can only leave PR comments, never approve or merge. It's basically a config-driven, pluggable AI review layer sitting in front of human review.\"",
      'End to end:\n1. **Trigger** — a PR event in the application repo runs a tiny caller workflow.\n2. **Shared workflow** — checks out the code, resolves the review prompt, and runs `anthropics/claude-code-action`.\n3. **Prompt system** — one default prompt plus swappable role modules chosen by a per-repo mapping file.\n4. **Claude reviews** — inline comments on real issues, or a short "looks safe" note; strictly advisory.\n5. **Rollout** — the same caller file is in ~28 repositories.',
    ],
    followUps: [
      'Why a reusable workflow instead of copying the workflow into each repo?',
      'How do you stop the AI from approving or merging?',
      'What happens if a repo mapping references a missing role file?',
    ],
    tags: ['ai', 'code review', 'github actions', 'project'],
  },
  {
    id: 'itv-myai-79',
    level: 'intermediate',
    kind: 'open',
    prompt:
      'Why did you centralise the Claude review in one shared workflow instead of per-repo workflows?',
    probing: 'DRY thinking applied to CI at scale.',
    answer: [
      'We have many repositories: Terraform/OpenTofu infrastructure, Python data pipelines, React frontends, backend APIs, Databricks pipelines, etc. Two bad options were on the table:\n1. Copy-paste the same GitHub Actions workflow into every repo — a maintenance nightmare, because fixing one bug means editing 28 files.\n2. Write one custom review workflow per repo — too slow to maintain and inconsistent.',
      'Instead, we centralized everything in **one shared repository** called `cicd-workflows`, and every other repo just "calls" it. This is the same idea as a shared library in software — write the logic once, reuse it everywhere.',
    ],
    tags: ['github actions', 'reusable workflows', 'dry'],
  },
  {
    id: 'itv-myai-80',
    level: 'intermediate',
    kind: 'open',
    prompt: 'How is the Claude review triggered from an application repository?',
    probing: 'Understanding of reusable workflow calls, PR event types and passing secrets.',
    answer: [
      'Each application repository (e.g. `infrastructure`, `CMM`, `tenetic-v3-agent`) has a tiny file, `.github/workflows/claude-code-review.yml`.',
      'It listens for pull request events — opened, updated (`synchronize`), marked ready for review, or reopened — and skips draft PRs. It doesn\'t contain any review logic itself. It just says: "when a PR happens, go run the shared workflow in `tenetic/cicd-workflows`, and pass it my repo name."',
      'This is a **reusable GitHub Actions workflow** — think of it like calling a function and passing arguments (the repo name and an API key secret). The key itself is referenced from repository secrets, never written in the file.',
    ],
    code: [
      {
        title: 'Caller workflow',
        language: 'yaml',
        code: `on:
  pull_request:
    types: [opened, synchronize, ready_for_review, reopened]
jobs:
  review:
    if: \${{ !github.event.pull_request.draft }}
    uses: tenetic/cicd-workflows/.github/workflows/claude-code-review.yml@main
    with:
      repository-name: \${{ github.event.repository.name }}
    secrets:
      ANTHROPIC_API_KEY_03: \${{ secrets.ANTHROPIC_API_KEY_03 }}`,
      },
    ],
    tags: ['github actions', 'reusable workflows', 'ci/cd'],
  },
  {
    id: 'itv-myai-81',
    level: 'advanced',
    kind: 'open',
    prompt: 'What does the shared review workflow do, and how is Claude restricted?',
    probing: 'Least-privilege tool scoping for an AI agent inside CI.',
    answer: [
      "Inside `cicd-workflows/.github/workflows/claude-code-review.yml`, three things happen:\n1. **Checkout the code** — pull down the PR's files so there's something to review.\n2. **Resolve the review prompt** — a step figures out exactly what instructions to give Claude for this specific repository.\n3. **Run `anthropics/claude-code-action`** — the official GitHub Action that runs Claude Code inside the pipeline, hands it the prompt, and restricts what tools it's allowed to use.",
      'Allowed tools:\n- It can post inline PR comments (`mcp__github_inline_comment__create_inline_comment`)\n- It can run a few read-only `gh` CLI commands (`gh pr comment`, `gh pr diff`, `gh pr view`)\n- It is **not** given permission to approve, merge, or change PR metadata — it can only leave comments.',
      'Claude reads the PR diff, applies whatever combination of general + role-specific instructions it was given, and:\n- Leaves inline comments on specific lines when it finds real issues (bugs, security holes, hardcoded secrets, bad IAM permissions, missing encryption, etc.)\n- Leaves a short "looks safe" note if there\'s nothing to flag\n- Never modifies the PR itself — strictly advisory',
      "**Least privilege:** Claude's GitHub token scope only allows commenting — it structurally cannot approve or merge a PR.",
    ],
    followUps: [
      'Why is structural restriction better than telling the model "do not approve" in the prompt?',
    ],
    tags: ['ai', 'least privilege', 'github actions'],
  },
  {
    id: 'itv-myai-82',
    level: 'advanced',
    kind: 'open',
    prompt: 'How does the modular prompt system for the Claude review work?',
    probing: 'Composable configuration and fail-fast assembly.',
    answer: [
      "This is the clever part, and the part I'd highlight most in an interview: **the review instructions are modular, like a config file, not hardcoded.**",
      '- `prompts/claude-code-review/default.md` — the base instructions every repo gets: focus on real bugs, security risks, maintainability, CI/CD safety, doc accuracy; specifically flag hardcoded secrets/credentials/tokens; only comment, never approve or merge.\n- `prompts/claude-code-review/roles/*.md` — specialized reviewer "hats," each written like "Act as a senior AWS security reviewer..." Examples: `aws.md`, `python.md`, `opentofu.md`, `databricks.md`, `sensitive-data.md`, `web-applications.md`.\n- `prompts/claude-code-review/repositories/<repo-name>.txt` — a simple text file per repo listing which role files apply. For example, the `infrastructure` repo\'s mapping lists `opentofu.md`, `aws.md`, `github.md`, `shell.md`, `identity-and-saas.md`, `data-platforms.md` — because that repo is all Terraform/AWS.',
      "A small bash script (`resolve-claude-code-review-prompt.sh`) does the assembly at run time:\n1. Start with `default.md`.\n2. Look up the calling repo's `.txt` mapping file.\n3. Append each listed role file's content.\n4. Replace placeholders like `{{REPOSITORY}}`, `{{REPOSITORY_NAME}}`, `{{PR_NUMBER}}` with real values from the current PR.\n5. Fail loudly (with a clear error) if any expected file is missing — so a typo in a repo mapping can't silently produce an empty or broken review.",
      'If a repo has no mapping file at all, it just gets the generic `default.md` review — so onboarding a new repo requires zero extra work, and you only add specialization when you need it.',
    ],
    followUps: ['How would you version prompts so a prompt change can be rolled back?'],
    tags: ['ai', 'prompting', 'bash'],
  },
  {
    id: 'itv-myai-83',
    level: 'basic',
    kind: 'open',
    prompt: 'How was the Claude review rolled out, and what design principles does it demonstrate?',
    probing: 'Whether you can name the principles behind the design.',
    answer: [
      'The same pattern (one caller-workflow file per repo, pointing at the shared workflow) has been added to ~28 repositories — infra, data pipelines, frontends, backend APIs — tracked in a single checklist in the `cicd-workflows` docs. Adding Claude review to a new repo is a 5-line YAML file plus, optionally, a one-line-per-role `.txt` mapping file.',
      "- **DRY (Don't Repeat Yourself):** one shared workflow instead of 28 copies.\n- **Composable prompts:** default + role modules + repo mapping, so specialization doesn't mean duplication.\n- **Least privilege:** Claude's GitHub token scope only allows commenting — it structurally cannot approve or merge a PR.\n- **Fail-fast:** the prompt-resolution script errors out clearly instead of silently reviewing with an empty or wrong prompt.\n- **Cheap to extend:** onboarding a new repo, or adding a new specialization, is a small config change, not new code.",
    ],
    tags: ['ai', 'code review', 'design principles'],
  },
]
