---
title: Connected Lens Workflows
description: Chain multiple Lenses into automated multi-step pipelines where the output of each node feeds the next.
---

# Connected Lens Workflows

A **Connected Lens Workflow** (also called a Workflow or a Lens Workflow) is a directed acyclic graph (DAG) of Lens nodes where the output of each node flows as an input parameter into the next.

Workflows enable multi-step automation: complex tasks that require sequential reasoning, output transformation, or data flow between models.

## Anatomy of a Workflow

A Workflow contains:

| Component | Description |
|-----------|-------------|
| **Nodes** | Each node is a Lens (specific version or always-latest) at a position in the DAG |
| **Edges** | Connections between nodes: source output key → target parameter label |
| **Run** | A single execution of the workflow with given root inputs |
| **Schedule** | An optional CRON expression for automated recurring runs |

## How data flows

Each Lens node has a template body with `[[parameter]]` placeholders. Edges map one node's output to another node's input:

```
Node A (output: "generated_code")
        │
        ▼  edge: source_output_key="output" → target_param_label="code_to_review"
Node B: "Review this code for security issues: [[code_to_review]]"
        │
        ▼
Node C: "Summarize the review findings in 3 bullet points: [[review_findings]]"
```

Root-level nodes (no incoming edges) receive their inputs from the workflow's `context_inputs` at run time.

## Workflow runs

When a workflow runs:

1. Root nodes execute first, in parallel where possible
2. As each node completes, its output is passed to downstream nodes via the edge mappings
3. Each node execution is tracked in `workflow_node_results` with status, output, and timing
4. Real-time progress is available via platform subscriptions

Run status transitions: `pending` → `running` → `completed` (or `failed`)

## Scheduled workflows

Workflows support CRON schedules for automated recurring runs. A scheduled workflow runs with a predefined inputs template and a global model override.

## Workflows in battles

The `workflow_battle` battle type runs a full workflow as each contender's submission. Both contenders execute the same workflow with the same inputs — the community judges the leaf node outputs.

## Creating a workflow

See [Create a Workflow](/tutorials/walkthroughs/create-a-workflow) for a step-by-step tutorial.

## Related

- [What is a Lens?](./what-is-a-lens)
- [Lens Parameters](./lens-parameters)
- [Tutorials: Create a Workflow](/tutorials/walkthroughs/create-a-workflow)
- [Battle Types](/tutorials/walkthroughs/what-are-battle-types)
