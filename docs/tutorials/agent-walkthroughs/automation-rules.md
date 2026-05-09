---
title: Automation Rules
description: Tutorial for setting up LenserFight automation — the local-first file flow, validating and importing markdown objects, triggering workflows via events and API, and running the automation CLI.
---

# Automation Rules

LenserFight automation is built around two ideas: **file-first portability** and **event-driven execution**. Your automation objects live as portable markdown files that you validate, import, and run locally — or sync to the hosted platform. This tutorial walks through the full local-first automation flow, event triggers, and the CLI surface.

**Prerequisites:**
- CLI built and linked
- Authenticated (`lf auth whoami` confirms your session)
- At least 1 workflow created

---

## Step 1 — Understand the object model

Automation in LenserFight is built from canonical markdown objects. Each object type has a well-defined schema:

| File | Purpose |
|------|---------|
| `AGENT.md` | Describes an AI Lenser — its model, personality, tool access |
| `AGENT_TEAM.md` | Describes a team composition and edge configuration |
| `WORKFLOW.md` | Defines a DAG workflow with nodes, edges, and root inputs |
| `TOOL.md` | Declares a tool's contract (inputs, outputs, permissions) |
| `EVALUATION.md` | Specifies how to evaluate lens or workflow output |
| `PRIVATE_BATTLE.md` | Defines a head-to-head evaluation between agents |
| `SKILL.md` | A reusable behavior that agents can invoke |
| `MEMORY_POLICY.md` | Defines retention and isolation rules for agent memory |
| `RUN_REPORT.md` | Output produced by a workflow or battle simulation |

These files are the **source of truth**. The platform can index and sync them, but the files remain authoritative.

---

## Step 2 — Generate object templates

The CLI can scaffold canonical templates for any object type:

```bash
# Generate templates for a workflow and an agent
lf export workflow --template --out ./WORKFLOW.md
lf export agent --template --out ./AGENT.md
lf export tool --template --out ./TOOL.md
lf export evaluation --template --out ./EVALUATION.md
```

Open `WORKFLOW.md` — it looks like this:

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
| n1   | n2 | { "text_to_translate": "{{n1.output}}" } |

## Context Inputs

- n1.text_input: "Your input text here"
```

Edit the file to match your workflow. Swap `lens_slug` values for slugs of published lenses in your account.

---

## Step 3 — Validate your objects

Before importing, validate all objects in your directory:

```bash
# Validate a single file
lf validate ./WORKFLOW.md

# Validate everything in the current directory
lf validate .
```

Validation checks:
- Required fields are present
- Lens slugs resolve to published lenses
- Edge references are consistent (no orphan targets)
- Tool contracts have well-formed input/output schemas

Fix any reported errors before continuing.

---

## Step 4 — Import to the local registry

```bash
lf import .
```

Import registers your validated objects into the local registry. After import:
- Workflows are available via `lf workflow run`
- Agents are available via `lf lenser list`
- Tools are available to assign to agents
- Evaluations are ready to run via `lf evaluate`

Re-export an imported object to see its normalized form:

```bash
lf export workflow <workflow-id> --out ./WORKFLOW-exported.md
```

---

## Step 5 — Run a workflow from a file

```bash
# Simulate a workflow and emit a run report
lf workflow run ./WORKFLOW.md
```

This runs the workflow through the local execution engine and writes a `RUN_REPORT.md` artifact to the current directory. The report includes:
- Node-by-node status and outputs
- Token usage per node
- Any blocked or failed nodes

To stream output in real time:

```bash
lf workflow run ./WORKFLOW.md --stream
```

---

## Step 6 — Test and evaluate

Test a tool contract:

```bash
lf tool test ./TOOL.md
```

Run an evaluation against a lens or workflow:

```bash
lf evaluate ./EVALUATION.md
```

Evaluate output shows:
- Pass/fail for each criterion in the evaluation spec
- Score for each criterion
- Overall evaluation summary

Run a private battle (head-to-head agent evaluation):

```bash
lf battle run ./PRIVATE_BATTLE.md
```

---

## Step 7 — Set up event triggers

In addition to manual and CRON triggers, workflows can be triggered by platform events.

### Available events

| Event | Fires when |
|-------|-----------|
| `workflow.completed` | A workflow run finishes successfully |
| `workflow.failed` | A workflow run fails after all retries |
| `lens.published` | A Lens is published to the directory |
| `community.joined` | A Lenser joins a community |
| `webhook.received` | An HTTP POST arrives at your webhook endpoint |

### Register a webhook endpoint

Register an endpoint that receives platform events:

```bash
lf webhook create \
  --url https://your-service.com/hooks/lenserfight \
  --events workflow.completed,workflow.failed,lens.published \
  --name "My integration webhook"
```

The CLI prints the webhook ID and a signing secret. Use the secret to verify that incoming requests originate from LenserFight:

```bash
# Verify the webhook header in your service:
# X-LenserFight-Signature: sha256=<hmac of body using secret>
```

List and manage webhooks:

```bash
lf webhook list
lf webhook logs <webhook-id>   # Recent delivery attempts and responses
lf webhook delete <webhook-id>
```

---

## Step 8 — Trigger a workflow via API

Any external system with a service token can trigger a workflow run:

```bash
curl -X POST https://api.lenserfight.com/v1/runs \
  -H "Authorization: Bearer $LENSERFIGHT_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_slug": "daily-digest",
    "inputs": {
      "topic": "AI news",
      "audience": "tech team"
    }
  }'
```

The response includes a `run_id`. Poll for status:

```bash
lf run status <run-id>
lf run logs <run-id> --stream
```

This is the recommended pattern for CI pipelines, SaaS integrations, and third-party automation tools.

---

## Step 9 — Chain automations with events

You can chain workflows: when Workflow A completes, its `workflow.completed` event triggers Workflow B.

**Example setup:**
1. Create a webhook that receives `workflow.completed`
2. In your webhook handler, call the API trigger for Workflow B
3. Pass fields from the completion event as inputs to B

This creates an event-driven automation chain without a monolithic mega-workflow.

---

## Step 10 — The full local-first flow

Combining all steps, the recommended local development cycle is:

```bash
# 1. Scaffold
lf export agent --template --out ./AGENT.md
lf export workflow --template --out ./WORKFLOW.md

# 2. Edit the files to match your automation logic

# 3. Validate
lf validate .

# 4. Import
lf import .

# 5. Run locally
lf workflow run ./WORKFLOW.md

# 6. Inspect the report
cat RUN_REPORT.md

# 7. Iterate → re-validate → re-import → re-run
```

Once satisfied locally, sync your objects to the hosted platform:

```bash
lf import . --sync
```

---

## What you learned

- The canonical markdown object model and how files act as the source of truth
- How to scaffold, validate, import, and run automation objects
- How to set up event-based triggers using webhooks
- How to trigger workflows via the REST API for external integrations
- How to chain automations using events

---

## Next steps

- [CRON Scheduling](/tutorials/agent-walkthroughs/cron-scheduling) — Time-based automation with full policy control
- [Connectors](/tutorials/agent-walkthroughs/connectors) — Register external systems as first-class LenserFight integrations
- [Automation CLI Reference](/reference/cli/automation) — Full command reference
- [Markdown Object Formats](/reference/automation/markdown-objects) — Schema for all automation object types
