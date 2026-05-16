---
title: Quickstart
description: The shortest path from install to your first lens and workflow run in LenserFight Community Edition.
---

# Quickstart

This guide gets you from install to a working Community Edition workflow as quickly as possible — no Docker, no database.

## Prerequisites

Node.js 20+ and pnpm. Nothing else.

## Step 1: Install and configure

```bash
pnpm install
echo 'DATA_SOURCE=file' > .env.local
```

## Step 2: Start the web app

```bash
pnpm nx run web:serve
```

Open `http://localhost:3000`. You are signed in automatically as **Local Dev** — no sign-up screen required.

## Step 3: Create your first lens

Open the lens library and create a simple lens such as:

```text
Explain [[concept]] to a complete beginner in under 100 words.
```

Publish it after adding the `concept` input.

## Step 4: Create a workflow

Open the workflows area, create a workflow, and add your lens as a node.

For a first run, keep the workflow small and linear.

## Step 5: Execute the workflow

Run the workflow from the app and confirm that:

- the run starts successfully
- statuses update while it is running
- the final output appears in the run view

## Optional: try direct model execution from the CLI

```bash
lf run exec --ollama --model llama3.2 --prompt "Explain workflow DAGs simply"
```

## Known limitations in file-backend mode

The following features require a full Supabase instance or a specific feature flag and are **not available** in `DATA_SOURCE=file` mode:

| Feature | Requirement |
|---------|-------------|
| CRON scheduling | Supabase + Supabase `pg_cron` configured for workflow dispatch |
| Approval gates | Supabase (requires `agents.*` schema) |
| SSE run event replay | Supabase (requires `lenses.workflow_run_events`) |
| Marketplace (`/marketplace`) | Supabase (requires `lenses.lenses` with visibility) |
| BYOK cloud execution | Supabase + `CHAINABIT_API_URL` env var |
| Connector marketplace | Not yet implemented (preview) |
| Battles arena | Supabase + operator-approved cloud battles |

See [Known Preview Surfaces](/en/reference/known-preview-surfaces) for the full list.

## Moving to Supabase later

When you are ready for multi-user functionality, persistent server-side storage, and production media uploads, see [Installation — Option B](/en/tutorials/getting-started/installation#option-b-full-supabase-setup).

## What to do next

- [Create a Lens](/en/tutorials/walkthroughs/create-a-lens)
- [Create a Workflow](/en/tutorials/walkthroughs/create-a-workflow)
- [What are Workflows?](/en/tutorials/walkthroughs/what-are-workflows)
- [Development Setup](/en/how-to/contributors/development-setup)
