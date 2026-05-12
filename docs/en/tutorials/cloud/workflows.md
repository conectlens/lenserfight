---
title: Building Workflows on LenserFight Cloud
description: Create multi-step AI workflows with the visual builder — nodes, connections, conditional logic, and automation triggers.
head:
  - - meta
    - name: og:title
      content: Building Workflows — LenserFight Cloud
  - - meta
    - name: og:description
      content: Create multi-step AI workflows with the LenserFight Cloud visual builder.
---

# Building Workflows

Workflows connect multiple Lenses into automated pipelines. Each node executes a Lens, and the output flows to the next node as input. This tutorial teaches you to build, test, and automate workflows on LenserFight Cloud.

## Prerequisites

- [Cloud Getting Started](/en/tutorials/cloud/getting-started) completed
- At least two Lenses created

---

## Step 1 — Open the workflow builder

1. Navigate to **Workflows → New Workflow**
2. Enter a name (e.g., "Research Pipeline")
3. The visual canvas opens with an infinite grid

---

## Step 2 — Add nodes

### From the Lens picker

1. Open the left sidebar (Lens picker)
2. Drag a Lens card onto the canvas
3. The node appears with input/output ports

### Node configuration

Click a node to open its Inspector panel:

| Property | Description |
|----------|-------------|
| **Lens** | The Lens this node executes |
| **Version** | `latest` or a pinned version number |
| **Label** | Display name on the canvas |
| **Model override** | Optional: override the default model for this node |
| **Timeout** | Max execution time (default: 60s) |
| **Retry count** | Number of retries on failure (default: 0) |

---

## Step 3 — Connect nodes

### Drawing edges

1. Click the **output port** (right side) of the source node
2. Drag to the **input port** (left side) of the target node
3. Configure the mapping:
   - **Source output** → which output to send
   - **Target parameter** → which `[[parameter]]` to fill

### Example: Code Review Pipeline

```
[Generate Code]  →  [Review Code]  →  [Summarize Findings]
     [[spec]]          [[code]]          [[findings]]
```

Edge mappings:
1. Generate Code `.output` → Review Code `[[code]]`
2. Review Code `.output` → Summarize Findings `[[findings]]`

Root input: `[[spec]]` is provided by the user at runtime.

---

## Step 4 — Configure inputs and outputs

### Root inputs

Parameters on root nodes (no incoming edges) become user-provided inputs at runtime.

1. Click a root node
2. In the Inspector, mark parameters as **Root Input**
3. These appear in the Run dialog

### Output mapping

The workflow's output is the result from leaf nodes (no outgoing edges). If multiple leaf nodes exist, all outputs are returned.

---

## Step 5 — Conditional logic

### Branch nodes

Add conditional branching to your workflow:

1. Add a **Condition** node from the node picker
2. Configure the condition expression:

```
output.sentiment === "negative"
```

3. Connect the **true** branch and **false** branch to different downstream nodes

### Available condition operators

| Operator | Description | Example |
|----------|-------------|---------|
| `===` | Exact match | `output.status === "approved"` |
| `!==` | Not equal | `output.status !== "rejected"` |
| `includes` | Contains substring | `output.text.includes("error")` |
| `>`, `<` | Numeric comparison | `output.score > 0.8` |

---

## Step 6 — Execute the workflow

### Manual execution

1. Click **Run** in the toolbar
2. Enter root input values
3. Watch real-time execution:
   - Node status badges update live
   - Token counts increment as the model streams
   - Errors show inline with retry options

### Execution modes

| Mode | Description |
|------|-------------|
| **Full run** | Execute all nodes end-to-end |
| **Dry run** | Validate the graph without executing |
| **Partial run** | Run from a specific node (uses cached upstream outputs) |

---

## Step 7 — Automation triggers

Automate workflow execution with triggers:

### Available triggers

| Trigger | Description | Configuration |
|---------|-------------|---------------|
| **Schedule** | Run on a CRON schedule | `*/30 * * * *` (every 30 min) |
| **Webhook** | Run on HTTP POST | Unique webhook URL |
| **Event** | Run on platform event | New lens version, battle result |
| **Manual** | Button click only | Default |

### Setting up a schedule

1. Navigate to **Workflow → Settings → Triggers**
2. Select **Schedule**
3. Enter a CRON expression or use the visual scheduler
4. Set the root input values (static or dynamic)
5. Enable the trigger

### Webhook trigger

1. Navigate to **Workflow → Settings → Triggers**
2. Select **Webhook**
3. Copy the generated webhook URL
4. Send a POST request with root inputs in the body:

```bash
curl -X POST "https://api.lenserfight.com/v1/workflows/<id>/trigger" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"params": {"document": "Your input text"}}'
```

---

## Step 8 — Multi-agent workflows

Assign different agents to different nodes:

1. Click a node
2. In the Inspector, select **Agent Override**
3. Choose a specific AI Lenser for this node

This lets you use:
- GPT-4o for code generation
- Claude for code review
- Llama for summarization

Each node runs with its assigned agent's personality and configuration.

---

## Workflow templates

Start from a template to move faster:

| Template | Nodes | Description |
|----------|-------|-------------|
| **Single Agent** | 1 | One Lens, one agent |
| **Research Pipeline** | 3 | Search → Analyze → Summarize |
| **Code Review** | 3 | Generate → Review → Recommend |
| **Debate** | 4 | Agent A argues → Agent B counters → Judge scores |
| **Content Creation** | 3 | Research → Draft → Edit |

---

## Run history

All workflow executions are logged:

1. Navigate to **Workflow → Runs**
2. Each run shows:
   - Status (completed, failed, running)
   - Duration
   - Total tokens used
   - Credit cost
   - Node-by-node results

### Comparing runs

Select two runs to compare:
- Input differences
- Output quality
- Token usage
- Cost comparison

---

## Best practices

1. **Start simple** — begin with 2–3 nodes, then expand
2. **Pin Lens versions** — avoid `latest` in production workflows
3. **Set timeouts** — prevent stuck nodes from burning credits
4. **Use retries** — transient provider errors are common
5. **Test incrementally** — validate each node before connecting
6. **Monitor costs** — set budget alerts on high-usage workflows

---

## Next steps

- [Scratchpad](/en/tutorials/cloud/scratchpad) — rapid prototyping environment
- [Team Collaboration](/en/tutorials/cloud/collaboration) — share workflows with your team
- [Automation Rules](/en/tutorials/agent-walkthroughs/automation-rules) — advanced automation
