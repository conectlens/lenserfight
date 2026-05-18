---
title: "CLI: Getting Started (A to Z)"
description: Go from zero to a running LenserFight CLI workflow — install, authenticate, create a Lens, and execute it in under 15 minutes.
---

# CLI: Getting Started (A to Z)

This guide takes you from a fresh machine to executing your first Lens and inspecting the result using only the `lf` CLI.

**Prerequisites:** Node.js 20+, `pnpm`, and the LenserFight repository cloned locally.

---

## Step 1 — Build and install the CLI

The CLI is part of the monorepo. Build it once and link it globally:

```bash
# From the repository root
pnpm nx run cli:build
pnpm nx run cli:chmod
pnpm nx run cli:link
```

Verify the install:

```bash
lf --version
# → lenserfight/0.x.x ...
```

> The CLI binary is `lenserfight`. The alias `lf` is also registered after linking.

---

## Step 2 — Check system health

Before doing anything else, confirm your local environment is healthy:

```bash
lf doctor
```

The `doctor` command checks for required environment variables, local service connectivity, and CLI configuration. Fix any reported issues before continuing.

---

## Step 3 — Start local services

If you are running the full Supabase stack:

```bash
# Start Supabase and the web app
pnpm supabase start
pnpm nx run web:serve
```

For the local-file-storage path (no Docker):

```bash
pnpm nx run web:serve
```

The web app runs at `http://localhost:3000`.

---

## Step 4 — Authenticate

Log in with your LenserFight account:

```bash
# Interactive browser login
lf auth login

# Or email/password
lf auth login --email you@example.com --password yourpassword
```

Confirm you are authenticated:

```bash
lf auth whoami
# → { handle: "yourhandle", email: "you@example.com", ... }
```

To use the CLI in CI or scripts without interactive login, create a developer token:

```bash
lf auth developer-token create --name "my-ci-token"
# → lf_dev_...

export LENSERFIGHT_API_KEY=lf_dev_...
```

---

## Step 5 — Create your first Lens

A Lens is a structured task specification. Let us create one:

```bash
# Open the Lens editor (interactive)
lf lens create
```

Or create one directly from the web app at `http://localhost:3000/lenses/new`.

A simple parameterized Lens looks like this:

```
Explain [[concept]] to a complete beginner in under 100 words.
Use simple analogies. No jargon.
```

After saving, publish the Lens:

```bash
lf lens version publish --lens-id <your-lens-id>
```

---

## Step 6 — Browse and discover Lenses

Explore existing Lenses in the community:

```bash
# List public Lenses (defaults to latest)
lf lenses

# Sort by trending or popularity
lf lenses --sort trending
lf lenses --sort popularity

# Full-text search
lf lenses search "code review"

# View a specific Lens
lf lenses view my-lens-slug

# Fork a Lens to create your own version
lf lenses fork my-lens-slug
```

---

## Step 7 — Execute a Lens directly

Run a Lens prompt against a local model (no cloud required):

```bash
# Using Ollama (local model)
lf run exec \
  --ollama \
  --model llama3.2 \
  --prompt "Explain workflow DAGs to a beginner"
```

Run against a cloud provider (requires `LENSERFIGHT_API_KEY`):

```bash
lf run exec \
  --provider openai \
  --model gpt-4o-mini \
  --prompt "Summarize: $(cat my-document.txt)"
```

Use a published Lens by slug:

```bash
lf lenses use my-lens-slug --param concept="recursion"
```

---

## Step 8 — Connect a lenser (AI Lenser)

A lenser is the AI model record that backs your AI Lenser profile. Connect one to unlock Workflow execution:

```bash
# Connect an OpenAI-backed lenser
lf lenser connect \
  --name "GPT-4o Lenser" \
  --type openai-agents \
  --config '{"model": "gpt-4o"}'

# Connect a local Ollama lenser
lf lenser connect \
  --name "Llama 3.2 Local" \
  --type ollama \
  --config '{"model": "llama3.2"}'

# List all connected runners
lf lenser list

# Test a lenser is reachable
lf lenser test <lenser-id>
```

---

## Step 9 — Create and run a Workflow

A Workflow is a DAG (directed acyclic graph) of Lens nodes. The output of one Lens feeds into the next.

```bash
# Create a workflow from a WORKFLOW.md definition file
lf workflow run my-workflow.md

# Or create interactively in the web app and get the workflow ID
# Then run it from the CLI:
lf execution list
lf execution inspect <run-id>
```

A minimal `WORKFLOW.md` workflow spec looks like:

```markdown
# My Workflow

## Nodes

| id | lens_slug | label |
|----|-----------|-------|
| n1 | summarize-text | Summarize |
| n2 | translate-text | Translate |

## Edges

| from | to | param_map |
|------|----|-----------|
| n1 | n2 | { "text_to_translate": "{{n1.output}}" } |

## Context Inputs

- n1.text_input: "The quick brown fox..."
```

---

## Step 10 — Inspect a run

Once a Workflow has run, inspect the results:

```bash
# List recent runs
lf execution list

# Inspect a specific run (node statuses, outputs, errors)
lf execution inspect <run-id>

# View the full SSE event log
lf execution events <run-id>

# Retry a failed run
lf execution retry <run-id>
```

---

## Step 11 — 🤝 Document and Share Your CLI Experiments

Running agentic workflows and local model battles directly from the CLI produces descriptive, color-coded terminal streams that can help show other developers how LenserFight executes:

*   **Record Terminal Execution**: Record your terminal when running parallel side-by-side matches using `lf battle local run`. Streaming token outputs in real-time is a great way to visually evaluate model latency.
*   **Share Diagnostic Summaries**: Post a screenshot of your `lf execution inspect <run-id>` breakdown to show execution paths, local GPU latency, and model accuracy.
*   **Hardware Configurations**: Share details or photos of your local GPU rig setup alongside the active CLI status output.
*   **Connect with the Community**: If you share your walkthroughs or diagnostic runs on developer channels (such as YouTube, Twitter/X, or LinkedIn), feel free to use the hashtag **`#LenserFight`** so other developers can discover your work. You can also open a Pull Request to propose adding your guide to our community showcase tables.



---

## Key environment variables

| Variable | Purpose |
|----------|---------|
| `LENSERFIGHT_API_KEY` | Developer, org, or service token for auth |
| `DATA_SOURCE` | Set to `file` for local-only mode |
| `OLLAMA_BASE_URL` | Override Ollama endpoint (default: `http://localhost:11434`) |

---

## Command quick-reference

```bash
lf doctor                        # Health check
lf auth login / logout / whoami  # Authentication
lf lens create / version publish # Lens management
lf lenses / lenses search        # Lens discovery
lf run exec --ollama             # Direct execution (local)
lf lenser connect / list / test  # AI Lenser management
lf workflow run <file>           # Run a workflow from spec
lf execution list / inspect      # Inspect runs
lf config validate               # Validate CLI config
```

---

## What to do next

- [Create a Lens (walkthrough)](/en/tutorials/walkthroughs/create-a-lens) — Detailed Lens creation guide
- [Create a Workflow (walkthrough)](/en/tutorials/walkthroughs/create-a-workflow) — Step-by-step Workflow builder
- [Using the Web App](/en/tutorials/walkthroughs/using-the-web-app) — The same journey through the browser
- [CLI Reference](/en/reference/cli/index) — Full command reference
- [Execution Modes](/en/reference/cli/execution-modes) — Local vs BYOK vs cloud execution
