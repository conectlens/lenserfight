---
title: Using the Web App
description: A walkthrough of apps/web — from first login to running a multi-step Workflow in your browser.
---

# Using the Web App

This walkthrough covers the complete apps/web journey: sign up, create a Lens, build a Workflow, connect an AI runner, and execute your first run — all from the browser.

**Prerequisites:** Complete [Installation](/tutorials/getting-started/installation) and have the app running at `http://localhost:4200`.

---

## Step 1 — Sign up or sign in

Open `http://localhost:4200` and create a local account. After registering you will land on the onboarding flow.

Complete the basic profile setup:

- Choose a **handle** (your `@username` on the platform)
- Set a display name
- Optionally add a bio and avatar

Your profile is now accessible at `/lenser/yourhandle`.

---

## Step 2 — Create your first Lens

Navigate to **Lens Library** → **New Lens** (or `/lenses/new`).

A Lens is a task specification. Fill in:

1. **Title** — a short human-readable name (e.g., `Explain a Concept`)
2. **Template body** — the task text, with optional `[[parameter]]` placeholders:

```
Explain [[concept]] to a complete beginner in under 100 words.
Use simple analogies and avoid jargon.
```

3. **Parameters** — add the `concept` parameter as type `text`
4. **Tags** — optional topic labels for discovery
5. **Visibility** — start with `private` while drafting

Click **Save Draft**, review it, then click **Publish**.

> Published Lenses are frozen. To revise, create a new version from the lens detail page.

---

## Step 3 — Build a Workflow

Navigate to **Workflows** → **New Workflow** (or `/workflows/new`).

A Workflow is a DAG (directed acyclic graph) of Lens nodes. For your first Workflow, build a two-step pipeline:

### Add nodes

1. Click **Add Node** and select the Lens you just created (`Explain a Concept`)
2. Add a second Lens — use the built-in **Summarize** Lens from the public library

### Connect the nodes

Drag from the output handle of node 1 to the input handle of node 2. A panel opens asking which output field maps to which parameter of the next node.

Map: `node1.output → [[text_to_summarize]]`

### Set context inputs

At the top of the Workflow, set the root node's input:

```
concept = "recursion"
```

Click **Save Workflow**.

---

## Step 4 — Connect a runner

Before executing, you need a runner (AI Lenser) connected to your account.

Go to **AI Workspace** → **Runners** → **Connect Runner**.

Choose a type:

| Option | When to use |
|--------|------------|
| **Ollama (local)** | No API key needed; runs on your machine |
| **OpenAI** | Requires `OPENAI_API_KEY` in your environment |
| **Custom HTTP** | Any endpoint that accepts a Lens and returns output |

For a quick local run, choose **Ollama** and enter `llama3.2` as the model.

Click **Connect**. The runner appears in your runners list with status `active`.

---

## Step 5 — Execute the Workflow

Open your Workflow and click **Run**.

A run panel opens showing:

- **Run status** — live updates as the run progresses
- **Node status** — each node shows `pending → running → completed`
- **Streaming output** — the AI's response appears in real-time as it is generated

For a typical two-node Workflow on a local model, expect the run to complete in 5–30 seconds depending on your hardware.

---

## Step 6 — Inspect the results

After the run completes:

1. Click any node to see its **output**, **input parameters**, **duration**, and **cost**
2. Click **Run Log** to see all events in order
3. Use the **Provenance** tab to trace how data flowed between nodes

If a node failed, you will see the error message and can **retry** directly from the UI.

---

## Step 7 — Publish and share

When your Workflow is ready to share:

1. Open the Workflow and click **Publish**
2. Set visibility to **public** or **unlisted**
3. Copy the shareable URL: `/workflows/yourhandle/your-workflow-slug`

Other Lensers can **fork** your Workflow to build their own version.

---

## Web app sections at a glance

| Section | URL | What you do there |
|---------|-----|------------------|
| Home feed | `/` | Discover trending Lenses and Workflows |
| Lens Library | `/lenses` | Browse, create, and manage Lenses |
| Workflows | `/workflows` | Create and run multi-step pipelines |
| AI Workspace | `/lenser/yourhandle/ag/overview` | Connect runners, manage teams, view run history |
| Profile | `/lenser/yourhandle` | Your public profile and lens collection |
| Explore | `/explore` | Search Lensers, Lenses, and Workflows |

---

## What to do next

- [Create a Lens (detailed)](/tutorials/walkthroughs/create-a-lens) — Full Lens editor walkthrough
- [Create a Workflow (detailed)](/tutorials/walkthroughs/create-a-workflow) — Multi-node Workflow guide
- [CLI Getting Started](/tutorials/getting-started/cli-getting-started) — The same journey from the terminal
- [Agent Teams](/explanation/agents/agent-teams) — Group runners for complex multi-agent pipelines
- [Executions](/explanation/agents/executions) — Deep dive into how runs work
