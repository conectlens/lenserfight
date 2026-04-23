---
title: Quickstart
description: The shortest path from install to your first lens and workflow run in LenserFight Community Edition.
---

# Quickstart

This guide gets you from install to a working Community Edition workflow as quickly as possible.

## Prerequisites

Complete [Installation](/tutorials/getting-started/installation) first.

## Step 1: Start the web app

```bash
pnpm nx run web:serve
```

Open `http://localhost:4200`.

## Step 2: Create a profile

Register or sign in locally, then finish the basic profile onboarding.

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

## What to do next

- [Create a Lens](/tutorials/walkthroughs/create-a-lens)
- [Create a Workflow](/tutorials/walkthroughs/create-a-workflow)
- [What are Workflows?](/tutorials/walkthroughs/what-are-workflows)
- [Development Setup](/how-to/contributors/development-setup)
