---
title: Export a Workflow
description: Read a workflow's node/edge graph in an LLM-readable form through the MCP server, understand the exported shape, and (roadmap) serialize it to portable Markdown, JSON, or YAML.
---

# Export a Workflow

A workflow is a directed acyclic graph: **nodes** (lens runs, triggers, logic, I/O, media) connected by **edges** that map one node's output to another node's parameters. *Exporting* a workflow means obtaining that graph in a self-describing form, so a person — or an LLM — can understand exactly how it is wired without opening the visual builder.

There are two audiences and two surfaces:

| Audience | Surface | Status |
|---|---|---|
| An AI agent reasoning over a live workflow | MCP `get_workflow_graph` | Available |
| A person archiving, diffing, or sharing a workflow file | CLI `lf workflow export` → Markdown / JSON / YAML | Roadmap |

## Read a workflow's graph from an AI agent (MCP)

The MCP server exposes **`get_workflow_graph`**. It returns the live definition — `{ workflow, nodes, edges }` — for any workflow the caller can see (public, or owned by the caller). It is read-only and visibility-gated.

Typical agent flow:

1. `list_workflows` or `get_workflow` → find a workflow id.
2. `get_workflow_graph { workflow_id }` → read the structure.
3. `run_workflow { workflow_id, inputs }` → execute, then `get_workflow_run_status` / `get_workflow_run_logs`.

A response looks like:

```json
{
  "workflow": { "id": "…", "title": "Research digest", "visibility": "public" },
  "nodes": [
    {
      "id": "n1",
      "lens_id": "…",
      "version_id": null,
      "ordinal": 0,
      "position_x": 120, "position_y": 80,
      "config": { "node_type": "manual_trigger" }
    },
    {
      "id": "n2",
      "lens_id": "…",
      "config": { "node_type": "lens", "model_id": "…", "param_overrides": { "topic": "[[n1.topic]]" } }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source_node_id": "n1",
      "target_node_id": "n2",
      "source_output_key": "output",
      "target_param_label": "topic",
      "merge_strategy": "last_write_wins"
    }
  ]
}
```

## Understand the exported shape

**Node** — one unit of work.

| Field | Meaning |
|---|---|
| `id` | Node id, referenced by edges and by `[[nodeId.field]]` expressions |
| `lens_id` | The bound lens (a parametric prompt), or `null` for a utility node |
| `version_id` | A pinned lens version, or `null` to use the lens head at run time |
| `ordinal`, `position_x/y` | Ordering and canvas placement |
| `config.node_type` | The node kind (`lens`, `manual_trigger`, `if_condition`, `http_request`, …) |
| `config.model_id` | Model override for AI nodes |
| `config.param_overrides` | Static values or `[[nodeId.field]]` upstream references, keyed by parameter label |

**Edge** — how data flows.

| Field | Meaning |
|---|---|
| `source_node_id` → `target_node_id` | Direction of data flow |
| `source_output_key` | Dotted path into the source node's output (e.g. `data.summary`) |
| `target_param_label` | Which parameter of the target node receives it |
| `merge_strategy` | Fan-in policy: `last_write_wins`, `concat`, `array`, `json_object` |
| `condition` | Optional predicate; the edge only carries data when it is satisfied |

An LLM can reconstruct the full execution logic from these two arrays alone: the topological order (from edges), what each node consumes and produces (from `param_overrides` + edges), and where the parametric prompts are bound (`lens_id` + parameter labels).

## What is — and is not — included

The graph carries **configuration references**, never secret values. A node's `config` may hold a key *reference* id (`key_ref_id`) or an integration selection, but the RPC never returns decrypted provider keys, and webhook secrets are stored outside the node graph. See [Workflow Safety](../../explanation/workflows/workflow-safety.md) for the redaction model.

## Export to a file (roadmap)

File export serializes the same graph into a portable artifact via the Universal Export System:

```bash
# Roadmap — tracked with the workflow export work.
lf workflow export <id|slug> --format md    # LLM-readable Markdown
lf workflow export <id|slug> --format yaml  # re-importable YAML
lf workflow export <id|slug> --format json  # canonical JSON
```

The Markdown serializer emits a metadata table, a per-node parameter-assignment table, and a connections table — the same information an LLM reads from `get_workflow_graph`, in a form a person can review in a pull request.

## Related

- [Workflow Concepts](../../explanation/workflows/workflow-concepts.md)
- [Workflow Safety](../../explanation/workflows/workflow-safety.md)
- [MCP workflow tools](../../reference/mcp-server/tools-workflow.md)
