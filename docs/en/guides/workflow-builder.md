---
title: Workflow Builder
description: Build and run automated AI pipelines in LenserFight using the visual node-graph workflow editor.
---

# Workflow Builder

LenserFight's workflow builder is a visual node-graph editor for automating AI pipelines. Each workflow is a directed acyclic graph (DAG): nodes perform discrete operations, and edges carry data downstream from one node to the next.

## Canvas Basics

```
[Trigger] ──► [Prompt Template] ──► [Summarizer] ──► [HTTP Request]
                                         │
                                    [IF Condition] ──true──► [Notify]
                                         │
                                      false──► [Stop]
```

Open a workflow from the sidebar or create one with **New Workflow**. The canvas renders your graph. Click a node to open its configuration panel on the right. Drag from a node's output port to another node's input port to draw an edge. Edges are typed — a node that produces `text` cannot connect directly to a node that expects a `list` without an intermediate Extract Field or Split in Batches node.

Zoom and pan with the scroll wheel and middle-click drag. Use the minimap (bottom-right) to navigate large graphs. Press `Ctrl+Z` / `Cmd+Z` to undo.

## Node Types

| Category | Node | What it does |
|---|---|---|
| **Triggers** | Manual | Starts a run when you click Run in the toolbar |
| **Triggers** | Schedule | Fires on a cron expression; supports retry and concurrency policy |
| **Triggers** | Webhook | Starts a run when an external system POSTs JSON to the trigger URL |
| **Triggers** | Event | Reacts to a platform event (e.g. `battle.closed`, `lens.run`) |
| **AI** | Prompt Template | Resolves a lens template with supplied parameters and sends it to a configured model |
| **AI** | Summarizer | Condenses a block of text to a target length using a model |
| **AI** | Classifier | Routes input to one of N labelled output paths based on model classification |
| **AI** | Translator | Translates text between languages using a model |
| **Data** | Filter | Passes only items matching a condition |
| **Data** | Sort | Orders a list by a field |
| **Data** | Aggregate | Reduces a list to a count, sum, min, max, or concatenation |
| **Data** | Extract Field | Pulls a single field out of a JSON object using a dot-path |
| **Data** | Deduplicate | Removes duplicate items from a list by a key field |
| **Data** | Text Splitter | Breaks a long string into overlapping or non-overlapping chunks |
| **Data** | Split in Batches | Splits a list into sub-lists of a fixed size for downstream processing |
| **Flow** | IF Condition | Evaluates a boolean expression and routes to the `true` or `false` branch |
| **Flow** | Switch | Routes to one of N branches based on an expression value |
| **Flow** | Merge | Waits for all upstream branches to complete, then combines their outputs |
| **Flow** | Try-Catch | Wraps a sub-graph; the catch branch runs if any node inside throws |
| **Flow** | Stop / Return | Terminates the run immediately and optionally emits a return value |
| **I/O** | HTTP Request | Sends a GET, POST, PUT, PATCH, or DELETE request and returns the response |
| **I/O** | GraphQL | Runs a GraphQL query or mutation against a configured endpoint |
| **I/O** | Object Storage | Reads or writes a file to the connected storage bucket |
| **Integrations** | Supabase Query | Runs a parameterised SQL or RPC call against your Supabase project |
| **Integrations** | GitHub Issue | Creates or updates a GitHub issue via the GitHub REST API |
| **Integrations** | Linear Issue | Creates or updates a Linear issue via the Linear API |
| **Integrations** | Notion Write | Appends a block to a Notion page via the Notion API |

## Running Workflows

### Manual

Click **Run** in the toolbar. If the workflow's root trigger has defined inputs, a dialog prompts you to supply them before the run starts. The canvas activates and edges light up as the execution progresses.

### Scheduled

Add a **Schedule** trigger node and enter a cron expression (e.g. `0 9 * * 1` for every Monday at 09:00 UTC). Open the trigger panel to configure:

- **Retry policy** — maximum retries and backoff strategy on failure.
- **Concurrency policy** — whether a new run may start while a previous run is still executing (`allow`, `skip`, or `queue`).

Schedules activate when the workflow is saved and published. Pause or delete the schedule trigger to stop future runs without deleting the workflow.

### Webhook

Set the trigger type to **Webhook**. Copy the URL shown in the trigger panel. External systems POST a JSON body to that URL to start a run. The JSON body is available as `trigger.body` inside the graph.

```bash
curl -X POST https://api.lenserfight.com/webhooks/<token> \
  -H "Content-Type: application/json" \
  -d '{"repo": "acme/backend", "event": "push"}'
```

### Single-Node Test

Right-click any node and choose **Run This Node**. The node executes in isolation using pinned data (if set) or an empty input. Use this to debug a single step without running the full graph.

To pin data on a node, click the node, open the **Inputs** tab, and click **Pin** next to any field. Pinned data persists across runs until cleared.

## Reading Run Results

After a run completes:

- **Green edges** show the execution path taken.
- **Dashed grey edges** show branches that were not taken (e.g. the false branch of an IF Condition).
- **Red node border** marks a node that threw an error.

Click any node to inspect:

- **Inputs tab** — the data that entered the node for this run.
- **Outputs tab** — the data produced by the node.

The **Event Log** (bottom panel) shows the full event stream with timestamps, node names, and token counts for AI nodes. Filter by node or event type to narrow the view.

Export a run summary by clicking **Export** in the event log — the download is a JSON file containing all node inputs, outputs, and timings.

## Cost

Each AI node call (Prompt Template, Summarizer, Classifier, Translator) consumes tokens and bills against the API key attached to the node's provider configuration. Set a **Budget** in **Settings → Budget** to cap total spend per run or per month. When a run would exceed the budget, it is cancelled and the event log records `BUDGET_EXCEEDED`.

To review cost for a completed run, open the Event Log and look at the **Cost** column, or use the `summarize_workflow` MCP tool for a concise post-run report.
