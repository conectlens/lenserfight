---
title: Quickstart
description: The shortest path from install to your first lens, workflow run, and community showcase in LenserFight.
---

# Quickstart

This guide gets you from repository clone to a working local Workflow run as quickly as possible — fully offline, zero Docker, zero database setup.

---

## Prerequisites

*   Node.js 22 LTS (highly recommended; Node 20+ supported)
*   `pnpm` (canonical package manager)
*   (Optional but recommended) [Ollama](https://ollama.com) installed and running locally for zero-cost offline models.

---

## Step 1: Install and Configure

Get the dependencies installed and set up the local file backend mode. Data will persist safely in browser IndexedDB (fully offline):

```bash
git clone https://github.com/conectlens/lenserfight.git
cd lenserfight
pnpm install
echo 'DATA_SOURCE=file' > .env.local
```

---

## Step 2: Start the Web App

Spin up the local developer server. The composition compiles in seconds:

```bash
pnpm nx run web:serve
```

Open `http://localhost:3000` in your browser. You are automatically signed in as **Local Dev** — no signup, credit card, or cloud accounts required.

---

## Step 3: Create Your First Lens

Go to the **Lenses** library inside the dashboard and create a simple, versioned prompt template:

1.  Click **Create Lens**.
2.  Input a Title (e.g., `Haiku Builder`).
3.  Write your versioned prompt:
    ```text
    Write a 3-line haiku about [[topic]] in the style of a strict system architect.
    ```
4.  Define `topic` as an input parameter in the parameters sidebar.
5.  Click **Publish Version**.

---

## Step 4: Create a Workflow DAG

Go to the **Workflows** library to orchestrate your first multi-agent Directed Acyclic Graph (DAG) pipeline:

1.  Click **Create Workflow**.
2.  Drag your newly published `Haiku Builder` Lens onto the canvas toolbar.
3.  Link inputs together. For a first run, keep the pipeline small and linear.
4.  Add a static execution value for `topic` (e.g., `TypeScript`).
5.  Save your workflow.

---

## Step 5: Execute and Observe

1.  Click **Run Workflow** from the canvas control panel.
2.  Select your provider (e.g., **Ollama** if running locally offline, or a **BYOK key** like OpenAI or Anthropic).
3.  Click **Execute Run** and watch the live execution:
    - Node statuses will change in real time on the canvas.
    - Token generation counts and execution latency appear as they complete.
    - Read the final generated haiku output directly in the inspection sidebar!

---

## Step 6: 🤝 Document and Share Your Workflow

LenserFight is built to support collaborative prompt design and experimentation. If you have successfully executed a workflow, you are welcome to share your setup:

*   **Take a Quick Capture**: Capture a screenshot of your finished DAG canvas or record a brief GIF of the active execution nodes to document the layout.
*   **Document Your Local Model Setup**: If you executed the workflow offline using Ollama or another local provider, note which model you ran (e.g., `llama3.2`) and observe its execution latency.
*   **Share with the Community**: You can drop your run results, screenshots, or workflow DAG configurations in our **GitHub Discussions** to discuss optimization strategies with other developers. You can also propose adding your walkthrough or tutorial to our repository showcases by opening a Pull Request.


---

## Optional: Try Direct Execution from the CLI

You can also run models and check environment health directly from the terminal:

```bash
# Verify environment requirements are green
pnpm setup:doctor

# Execute a quick offline prompt via local Ollama
node dist/apps/cli/main.js run exec --ollama --model llama3.2 --prompt "Explain workflow DAGs simply"
```

---

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

---

## What to do next

*   [Run an Offline Battle with Ollama](/en/tutorials/battle-walkthroughs/local-battle-quickstart)
*   [Configure Local Inference Engines (vLLM, llama.cpp)](/en/tutorials/getting-started/local-models)
*   [Create a Custom Lenser Agent](/en/tutorials/getting-started/developer-onboarding)
*   [How to Contribute a Translation](/en/how-to/contributors/adding-a-language)
